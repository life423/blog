import { DefaultAzureCredential } from '@azure/identity'
import { createDefaultHttpClient } from '@azure/core-rest-pipeline'
import { timeStorage } from './storage-timing.js'

export function createStorageCredential({ httpClient = createDefaultHttpClient() } = {}) {
    // ManagedIdentityCredential replaces additionalPolicies internally. Wrap its
    // normal transport instead, preserving the SDK's retries and token caching.
    const source = new DefaultAzureCredential({ httpClient: {
        sendRequest: request => timeStorage('auth_http', () => httpClient.sendRequest(request)),
    } })
    return { getToken: (...args) => timeStorage('auth', () => source.getToken(...args)) }
}
