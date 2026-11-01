import { DefaultAzureCredential } from '@azure/identity'
import { createDefaultHttpClient } from '@azure/core-rest-pipeline'
import { timeStorage } from './storage-timing.js'

export function createStorageCredential({ httpClient = createDefaultHttpClient() } = {}) {
    // ManagedIdentityCredential replaces additionalPolicies internally. Wrap its
    // normal transport instead, preserving the SDK's retries and token caching.
    const source = new DefaultAzureCredential({ httpClient: {
        sendRequest: request => timeStorage('auth_http', () => httpClient.sendRequest(request)),
    } })
    let preparing
    return {
        // Called once during boot, never on a timer. The SDK owns token caching
        // and refresh. Reads join startup work, then request their normal scope.
        prepare() {
            preparing ??= source.getToken('https://storage.azure.com/.default').finally(() => { preparing = undefined })
            return preparing
        },
        getToken: (...args) => timeStorage('auth', async () => {
            // A failed startup attempt must not poison later request retries.
            await preparing?.catch(() => {})
            return source.getToken(...args)
        }),
    }
}
