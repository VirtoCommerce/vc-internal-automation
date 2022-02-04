import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { getFullSonarReport } from "./sonarReport"
import fetch from "node-fetch";

const loginSecretParam = "ConfluenceLogin";
const passwordSecretParam = "ConfluenceToken";
const confluenceUrlParam = "ConfluenceUrl";

class Guard
{
    public static AgainstNull(argument: any, argumentName: string): any
    {
        if (argument == null)
        {
            throw new Error(`ArgumentNullException: ${argumentName} value cannot be null`) ;
        }
    }
}

interface ConfluencePageInfo
{
    type: string,
    title: string,
    ancestors: [
        {
            id: number
        }
    ], 
    space: {
        key: string
    },
    body: {
        storage:{
            value: string,
            representation: string
        }
    }
}

interface ResultBase {
    id: string
}

interface LongTaskResult extends ResultBase {
    finished: boolean
}

interface FindPagesResult {
    results: [
        {
            id: string
        }
    ]
}

function createPageInfo(pageType: string, pageTitle: string, spaceKey: string, subPageId: number, pageBody: string, pageRepresentation: string): ConfluencePageInfo {
    const pageSettings: ConfluencePageInfo = {
        type: pageType,
        title: pageTitle,
        ancestors: [{
            id: subPageId
        }], 
        space: {
            key: spaceKey
        },
        body: {
            storage: {
                value: pageBody,
                representation: pageRepresentation
            }
        }
    };

    return pageSettings;
}

async function findPage(pageTitle:string, spaceKey: string, confluenceUrl: string, login: string, token: string) : Promise<string> {
    console.log(`Check Confluence page ${pageTitle} exists`);

    const encodedTitle = encodeURIComponent(pageTitle);

    const queryUrl: string = confluenceUrl + `\?title=${encodedTitle}&spaceKey=${spaceKey}&status=current`;
    console.log(queryUrl);
    const headers = { 
        'Authorization': getAuthorization(login, token),
    }

    try {
        const response = await fetch(queryUrl, {
            method: 'GET',
            headers: headers
        });

        let apiResult = await response.json() as FindPagesResult;
        
        var result = apiResult?.results?.length 
            ? apiResult.results[0].id
            : null;

        return result;
    } catch (error) {
        console.error(error)
    }
}

// The archival process happens asynchronously, the /archive/ API returns task ID. Use the /longtask/ API to get the task status.
async function archivePage(pageId: string, confluenceUrl: string, login: string, token: string): Promise<string> {
    console.log(`Archive Confluence page ID:${pageId}`);

    const requestParams = {
        pages: [Number(pageId)]
    };

    const body: string = JSON.stringify(requestParams);

    const headers = { 
        'Authorization': getAuthorization(login, token),
        'Content-Type': 'application/json'
    }
    try {
        const archiveEndpointUrl = confluenceUrl + '/archive';
        const response = await fetch(archiveEndpointUrl, {
            method: 'POST',
            body: body,
            headers: headers
        });

        let apiResult = await response.json() as ResultBase;
        var result = apiResult?.id;

        return result;
    } catch (error) {
        console.error(error)
    }
}

async function checkTaskFinished(taskId: string, confluenceUrl: string, login: string, token: string) : Promise<boolean> {
    console.log(`Check task ID:${taskId} status`);

    const queryUrl: string = `${confluenceUrl}/longtask/${taskId}`;
    console.log(queryUrl);
    const headers = { 
        'Authorization': getAuthorization(login, token),
    }

    try {
        const response = await fetch(queryUrl, {
            method: 'GET',
            headers: headers
        });

        let apiResult = await response.json() as LongTaskResult;
        var result = apiResult?.finished;

        return result;
    } catch (error) {
        console.error(error)
    }
}

async function publishPage(confluencePageSettings: ConfluencePageInfo, confluenceUrl: string, login: string, token: string) {
    console.log("Publishing Confluence page");

    const body: string = JSON.stringify(confluencePageSettings);
    const headers = { 
        'Authorization': getAuthorization(login, token),
        'Content-Type': 'application/json'
    }
    try {
        const response = await fetch(confluenceUrl, {
            method: 'POST',
            body: body,
            headers: headers
        });

        return response;
    } catch (error) {
        console.error(error)
    }
}

function getAuthorization(login: string, token: string) : string {
    return `Basic ` + Buffer.from(`${login}:${token}`).toString('base64');
}

function getReportName(): string {
    const date = new Date(); 
    var quarter = Math.ceil((date.getMonth() + 1) / 3); 

    return `Quarter Report ${date.getFullYear()}-Q${quarter}`;
}

async function getReportBody(componentList:string []): Promise<string> {
//    const result: string = await getFullSonarReport(componentList);
//    return result;
var date = new Date();
return `<p>This is a new empty report from ${date.toUTCString()}.</p>`;

}

async function tryArchivePage(pageTitle: string, spaceKey: string, confluenceUrl: string, login: string, token: string) {
    let delay = 100;
    let retryCount = 5;

    const confluenceContentUrl = `${confluenceUrl}/content`;

    const pageId = await findPage(pageTitle, spaceKey, confluenceContentUrl, login, token);

    if (!pageId) {
        return;
    }

    // start archiving old report page if found
    const taskId = await archivePage(pageId, confluenceContentUrl, login, token); 

    if (!taskId) {
        return;
    }

    // retry 5 max times with increasing delay
    let taskFinished = false;

    do {
        await new Promise(f => setTimeout(f, delay));

        taskFinished = await checkTaskFinished(taskId, confluenceUrl, login, token);

        delay += 300;
        --retryCount;
    }
    while(!taskFinished && retryCount > 0)
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    const componentList:string [] = ['VirtoCommerce_vc-build','VirtoCommerce_vc-demo-storefront','VirtoCommerce_vc-demo-theme-b2b','VirtoCommerce_vc-demo-theme-default','VirtoCommerce_vc-demo-xapi-app','VirtoCommerce_vc-module-assets','VirtoCommerce_vc-module-Authorize.Net','VirtoCommerce_vc-module-avatax','VirtoCommerce_vc-module-azure-search','VirtoCommerce_vc-module-bulk-actions','VirtoCommerce_vc-module-cart','VirtoCommerce_vc-module-catalog','VirtoCommerce_vc-module-catalog-csv-import','VirtoCommerce_vc-module-catalog-export-import','VirtoCommerce_vc-module-catalog-personalization','VirtoCommerce_vc-module-catalog-publishing','VirtoCommerce_vc-module-changes-collector','VirtoCommerce_vc-module-content','VirtoCommerce_vc-module-core','VirtoCommerce_vc-module-customer','VirtoCommerce_vc-module-customer-export-import','VirtoCommerce_vc-module-customer-review','VirtoCommerce_vc-module-customer-segments','VirtoCommerce_vc-module-demo-customer-segments','VirtoCommerce_vc-module-demo-features','VirtoCommerce_vc-module-dynamic-associations','VirtoCommerce_vc-module-elastic-search','VirtoCommerce_vc-module-event-bus','VirtoCommerce_vc-module-experience-api','VirtoCommerce_vc-module-export','VirtoCommerce_vc-module-feature-flags','VirtoCommerce_vc-module-google-ecommerce-analytics','VirtoCommerce_vc-module-image-tools','VirtoCommerce_vc-module-inventory','VirtoCommerce_vc-module-lucene-search','VirtoCommerce_vc-module-marketing','VirtoCommerce_vc-module-notification','VirtoCommerce_vc-module-order','VirtoCommerce_vc-module-pagebuilder','VirtoCommerce_vc-module-payment','VirtoCommerce_vc-module-price-export-import','VirtoCommerce_vc-module-pricing','VirtoCommerce_vc-module-profile-experience-api','VirtoCommerce_vc-module-quote','VirtoCommerce_vc-module-search','VirtoCommerce_vc-module-shipping','VirtoCommerce_vc-module-simple-export-import','VirtoCommerce_vc-module-sitemaps','VirtoCommerce_vc-module-store','VirtoCommerce_vc-module-subscription','VirtoCommerce_vc-module-tax','VirtoCommerce_vc-module-webhooks','VirtoCommerce_vc-platform','VirtoCommerce_vc-storefront','VirtoCommerce_vc-theme-b2b','VirtoCommerce_vc-theme-default'];

    var responseMessage = "";
    var status = 200;

    try {
        const login = process.env[loginSecretParam];
        Guard.AgainstNull(login, loginSecretParam);
        const token = process.env[passwordSecretParam];
        Guard.AgainstNull(token, passwordSecretParam); 
        const confluenceUrl = process.env[confluenceUrlParam];
        Guard.AgainstNull(confluenceUrl, confluenceUrlParam);

        const spaceKey = req?.body?.spaceKey ?? "DE";
        const subPageId = req?.body?.subPageId ?? 2339700737

        const pageType = "page";
        const pageRepresentation = "storage";
        
        const pageTitle = getReportName();
        const pageBody = await getReportBody(componentList);
        
        const confluenceContentUrl = `${confluenceUrl}/content`;

        await tryArchivePage(pageTitle, spaceKey, confluenceUrl, login, token);

        // create new report page
        const pageInfo = createPageInfo(pageType, pageTitle, spaceKey, subPageId, pageBody, pageRepresentation);
        const publishResult = await publishPage(pageInfo, confluenceContentUrl, login, token);

        if (publishResult && publishResult.status === 200) {
            responseMessage = `Page "${pageTitle}" created.`;
        } else {
            var errorResult = await publishResult.json(); 
            responseMessage = errorResult['message'] as string ?? "Report creation error.";
            status =  publishResult ?  publishResult.status: 400;
        }
    } catch(error) {
        console.error(error);
        status = 400;
        responseMessage = error;
    }
 
    context.res = {
        status: status,
        body: responseMessage,
    };
};

export default httpTrigger;

