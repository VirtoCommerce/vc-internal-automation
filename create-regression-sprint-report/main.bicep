param functionAppName string = 'create-regression-report'
param storageAccountName string  = '${substring(functionAppName, 0, 10)}-{uniqueString(resourceGroup().id)}'
param packagePath string
param appServicePlanName string = '${functionAppName}-ServicePlan'
param location string = resourceGroup().location

@secure()
param ConfluenceLogin string 
@secure()
param ConfluenceToken string

param ConfluenceUrl string = 'https://virtocommerce.atlassian.net/wiki/rest/api/content/'
param JiraUrl string = 'https://virtocommerce.atlassian.net/rest/api/3/'


resource storageAccount 'Microsoft.Storage/storageAccounts@2021-04-01' = {
  name: storageAccountName
  location: resourceGroup().location
  kind: 'Storage'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    allowBlobPublicAccess: false
  }
}

resource appservice_plan 'Microsoft.Web/serverfarms@2020-12-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
}

resource functionApp 'Microsoft.Web/sites@2021-01-15' = {
  name: functionAppName
  location: location
  kind: 'functionapp'

  properties: {
    serverFarmId: appservice_plan.id
    siteConfig: {
      appSettings: [
        
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${listKeys(storageAccount.id, storageAccount.apiVersion).keys[0].value}'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~3'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${listKeys(storageAccount.id, storageAccount.apiVersion).keys[0].value}'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~14'
        }
        {
          name: 'ConfluenceLogin'
          value:ConfluenceLogin
        }
        {
          name: 'ConfluenceToken'
          value: ConfluenceToken
        }
        {
          name: 'ConfluenceUrl'
          value: ConfluenceUrl
        }
        {
          name: 'JiraUrl'
          value: JiraUrl
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: packagePath
        }
        // WEBSITE_CONTENTSHARE will also be auto-generated - https://docs.microsoft.com/en-us/azure/azure-functions/functions-app-settings#website_contentshare
        // WEBSITE_RUN_FROM_PACKAGE will be set to 1 by func azure functionapp publish
      ]
    }
  }
}
