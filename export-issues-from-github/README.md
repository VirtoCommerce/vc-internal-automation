# Export new issues from GitHub to Jira

Logic App exports o Jira VP project new issues created in all https://github.com/VirtoCommerce/ repositories.

## Overview

To trigger Logic App when new issue created GitHub issue Assignee field should be set. The value of the Assignee field should correspond to the user name from whom the connection is made from LogicApp to GitHub

To create an issue in Jira `Account` field required. `Account` field coded as `customfield_10042`

Add a field in code view

JSON should look like:

```json
"fields": {
    "customfield_10042": 13,
    "description": "@triggerBody()?['body']",
    "issuetype": {
        "id": "10006"
    },
    "summary": "@triggerBody()['title']"
}
```

To get an appropriate `customfield_10042` value use Jira API [search method](https://virtocommerce.atlassian.net//rest/api/3/field/io.tempo.jira__account/option/suggestions/search) (Permission to access Jira required).

Read more about [Jira API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/?utm_source=%2Fcloud%2Fjira%2Fplatform%2Frest%2F&utm_medium=302#api-rest-api-3-field-fieldKey-option-suggestions-search-get)