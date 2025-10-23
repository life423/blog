# Beyond the Stack - Dynamic Design System Blog

A modern, performance-focused blog application showcasing advanced CSS architecture and JavaScript-driven design systems.

## 🌟 Key Features

### Dynamic Design System
- **Modular Typography Scale**: JavaScript-generated type scales with responsive ratios
- **Fluid Spacing System**: Mathematical spacing scales that adapt across breakpoints  
- **Brand Color System**: Comprehensive color palettes with CSS custom properties
- **Responsive Layout Engine**: Container-query-like behavior with ResizeObserver

### Modern Architecture
- **ES6 Modules**: Clean, maintainable JavaScript architecture
- **Progressive Enhancement**: Graceful fallbacks for older browsers
- **Performance Optimized**: Dynamic CSS injection with minimal DOM overhead
- **Accessibility First**: WCAG compliant with proper focus management

## 🛠 Technical Highlights

- **No Build Tools Required**: Vanilla JavaScript with modern browser APIs
- **CSS Custom Properties**: Dynamic theming system
- **Mobile-First Responsive**: Adaptive navigation and typography
- **Zero Dependencies**: Pure JavaScript implementation

## CI/CD and Containerization

This repo includes a production-ready container and Azure Web App deployment workflow.

- Docker
  - Build: `docker build -t blog-frontend:local .`
  - Run: `docker run -p 8080:80 blog-frontend:local` and open http://localhost:8080
  - Image serves the `front/` folder via NGINX with SPA-friendly routing and static caching.

- GitHub Actions → Azure Web App for Containers
  - Workflow: `.github/workflows/azure-webapp-container.yml`
  - Required Azure resources (create once):
    - Azure Container Registry (ACR)
    - Azure Web App (Linux) configured for container images
  - Required GitHub secrets:
    - `AZURE_CREDENTIALS` — JSON from an Azure AD app/service principal with push + deploy permissions
    - `ACR_LOGIN_SERVER` — e.g., `myregistry.azurecr.io`
    - `ACR_USERNAME`, `ACR_PASSWORD` — ACR credentials (or use ACR admin user)
    - `WEBAPP_NAME` — Azure Web App name
    - `WEBAPP_RESOURCE_GROUP` — Resource group containing the Web App
  - On push to `main`, the workflow builds the Docker image, pushes to ACR, and deploys the new image to the Web App.

### Quick Azure CLI setup (example)

```bash
SUBSCRIPTION_ID=<sub-id>
RG=blog-rg
LOCATION=westeurope
ACR_NAME=myblogregistry   # must be globally unique
WEBAPP_NAME=my-blog-webapp
PLAN=blog-plan

az group create -n $RG -l $LOCATION
az acr create -n $ACR_NAME -g $RG --sku Basic --admin-enabled true
az appservice plan create -n $PLAN -g $RG --is-linux --sku B1
az webapp create -n $WEBAPP_NAME -g $RG -p $PLAN --runtime 'NODE|18-lts' # runtime placeholder; image is set by CI

# Service principal for GitHub Actions (Contributor on RG)
az ad sp create-for-rbac \
  --name blog-gha-deployer \
  --role contributor \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG" \
  --sdk-auth > azure_credentials.json

echo "Add these GitHub secrets:"
echo "AZURE_CREDENTIALS=$(cat azure_credentials.json)"
echo "ACR_LOGIN_SERVER=$(az acr show -n $ACR_NAME -g $RG --query loginServer -o tsv)"
echo "ACR_USERNAME=$(az acr credential show -n $ACR_NAME -g $RG --query username -o tsv)"
echo "ACR_PASSWORD=$(az acr credential show -n $ACR_NAME -g $RG --query 'passwords[0].value' -o tsv)"
echo "WEBAPP_NAME=$WEBAPP_NAME"
echo "WEBAPP_RESOURCE_GROUP=$RG"
```
