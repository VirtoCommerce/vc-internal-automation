param githubOrg string = 'VirtoCommerce'
param githubTeam string = 'platform'
param githubTeamStorefront string = 'storefront-team'
param jiraInstance string = 'https://virtocommerce.atlassian.net'
param jiraIssuetype string = '10160'
param jiraIssuetypeStorefront string = '10160'
param jiraProject string = 'PT'
param jiraProjectStorefront string = 'PT'
param reviewTaskLabel string = 'review task created'
param locationString string = resourceGroup().location
param logicAppName string = 'create-jira-issue-for-pr'
param integrationAccountId string
param jiraConnection object

@secure()
param githubAuthorizationHeader string

@secure()
param githubAuthorizationHeaderMembership string


var logicAppDefinition = loadJsonContent('create-jira-issue-for-pr.definition.json')

resource stg 'Microsoft.Logic/workflows@2019-05-01' = {
  name: logicAppName
  location: locationString
  tags: {
    displayName: logicAppName
  }
  properties: {
    definition: logicAppDefinition.resources[0].properties.definition
    parameters: {
      '$connections': {
          value: jiraConnection
      }
      github_authorization_header: {
          value: githubAuthorizationHeader
      }
      github_authorization_header_membership: {
        value: githubAuthorizationHeaderMembership
     }
      github_org: {
          value: githubOrg
      }
      github_team: {
          value: githubTeam
      }
      github_team_storefront: {
        value: githubTeamStorefront
      }
      jira_instance: {
          value: jiraInstance
      }
      jira_issuetype: {
          value: jiraIssuetype
      }
      jira_issuetype_storefront: {
        value: jiraIssuetypeStorefront
      }
      jira_project: {
          value: jiraProject
      }
      jira_project_storefront: {
        value: jiraProjectStorefront
      }
        review_task_label: {
          value: reviewTaskLabel
      }
    }
    integrationAccount: {
      id: integrationAccountId
    }
    
  }
}
