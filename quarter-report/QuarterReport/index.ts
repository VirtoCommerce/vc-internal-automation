import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { getFullSonarReport } from "./sonarReport"
import { getReleasesReport } from "./releasesReport"
import fetch from "node-fetch";

const loginSecretParam = "ConfluenceLogin";
const passwordSecretParam = "ConfluenceToken";
const confluenceUrlParam = "ConfluenceUrl";
const gitHubTokenParam = "GitHubToken";

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

function getQuarter(date: Date): number {
    const quarter = Math.ceil((date.getMonth() + 1) / 3); 
    return quarter;
}

function getReportName(fullYear: number, quarter: number): string {
    return `Quarter Report ${fullYear}-Q${quarter}`;
}

async function getReportBody(componentList:string [], year: number, quarter: number, gitHubToken: string): Promise<string> {
    const owner = 'VirtoCommerce';
    let result: string;
    result = await getFullSonarReport(componentList);
    result += await getReleasesReport (componentList, owner, year, quarter, gitHubToken)
    return result;
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
    const componentList:string [] = ['vc-module-assets','vc-module-Authorize.Net','vc-module-avatax','vc-module-azure-search','vc-module-bulk-actions','vc-module-cart','vc-module-catalog','vc-module-catalog-csv-import','vc-module-catalog-export-import','vc-module-catalog-personalization','vc-module-catalog-publishing','vc-module-changes-collector','vc-module-content','vc-module-core','vc-module-customer','vc-module-customer-export-import','vc-module-customer-review','vc-module-customer-segments','vc-module-demo-customer-segments','vc-module-demo-features','vc-module-dynamic-associations','vc-module-elastic-search','vc-module-event-bus','vc-module-experience-api','vc-module-export','vc-module-feature-flags','vc-module-google-ecommerce-analytics','vc-module-image-tools','vc-module-inventory','vc-module-lucene-search','vc-module-marketing','vc-module-notification','vc-module-order','vc-module-pagebuilder','vc-module-payment','vc-module-price-export-import','vc-module-pricing','vc-module-profile-experience-api','vc-module-quote','vc-module-search','vc-module-shipping','vc-module-simple-export-import','vc-module-sitemaps','vc-module-store','vc-module-subscription','vc-module-tax','vc-module-webhooks','vc-platform','vc-storefront','vc-theme-b2b','vc-theme-default'];

    var responseMessage = "";
    var status = 200;

    try {
        const login = process.env[loginSecretParam];
        Guard.AgainstNull(login, loginSecretParam);
        const token = process.env[passwordSecretParam];
        Guard.AgainstNull(token, passwordSecretParam); 
        const confluenceUrl = process.env[confluenceUrlParam];
        Guard.AgainstNull(confluenceUrl, confluenceUrlParam);
        const gitHubToken = process.env[gitHubTokenParam];
        Guard.AgainstNull(gitHubToken, gitHubTokenParam);

        const spaceKey = req?.body?.spaceKey ?? "DE";
        const subPageId = req?.body?.subPageId ?? 2339700737

        const pageType = "page";
        const pageRepresentation = "storage";
        
        const date = new Date();
        const quarter = getQuarter(date);
        const year = date.getFullYear();
        const pageTitle = getReportName(year, quarter);
        const pageBody = await getReportBody(componentList, year, quarter, gitHubToken);
        
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

