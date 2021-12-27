import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import fetch from "node-fetch";

interface ComponentInfo
{
    metric: string,
    value: number,
    component: string,
    bestValue: boolean
}

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


function createPageContent(componentList: ComponentInfo[], metricName: string){

    console.log("Creating Confluence page content");

    Guard.AgainstNull(componentList, 'componentList');

//    let pageBody: string = `<p><ac:structured-macro ac:name=\"jira\" ac:schema-version=\"1\" ac:macro-id=\"e6f873c8-59d1-4ae2-82ff-bf8e2378369f\"><ac:parameter ac:name=\"server\">System JIRA</ac:parameter><ac:parameter ac:name=\"serverId\">ddb34fca-5878-3e2d-898b-cb89d86c7acf</ac:parameter><ac:parameter ac:name=\"key\">${parentIssueKey}</ac:parameter></ac:structured-macro></p>`;
    let pageBody: string = '';
    let rowN: number = 0;

    pageBody += '<p></p>'
    pageBody += '<table><tbody>'
    pageBody += `<tr> <th>#</th> <th>Component</th> <th>${metricName}</th> </tr>`

    for(let component of componentList){
        pageBody += `<tr> <td>${++ rowN}</td> <td>${component.component}</td> <td>${component.value}</td> </tr>`
    }
    pageBody += '</tbody></table>';

    Guard.AgainstNull(pageBody, 'pageBody');

    return pageBody;
}


async function getCodeSmells(sonarUrl: string) {

    console.log(`Start search CodeSmells`);

    Guard.AgainstNull(sonarUrl, 'sonarUrl');
    const response = await fetch(sonarUrl, {
        method: 'get',
        headers: {'Content-Type': 'application/json'}
    });
    const result = await response.json();
    return result['measures'];
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    let baseUrl = 'https://sonarcloud.io/api/measures/search';
    let componentListString = 'VirtoCommerce_vc-build,VirtoCommerce_vc-demo-storefront,VirtoCommerce_vc-demo-theme-b2b,VirtoCommerce_vc-demo-theme-default,VirtoCommerce_vc-demo-xapi-app,VirtoCommerce_vc-module-assets,VirtoCommerce_vc-module-Authorize.Net,VirtoCommerce_vc-module-avatax,VirtoCommerce_vc-module-azure-search,VirtoCommerce_vc-module-bulk-actions,VirtoCommerce_vc-module-cart,VirtoCommerce_vc-module-catalog,VirtoCommerce_vc-module-catalog-csv-import,VirtoCommerce_vc-module-catalog-export-import,VirtoCommerce_vc-module-catalog-personalization,VirtoCommerce_vc-module-catalog-publishing,VirtoCommerce_vc-module-changes-collector,VirtoCommerce_vc-module-content,VirtoCommerce_vc-module-core,VirtoCommerce_vc-module-customer,VirtoCommerce_vc-module-customer-export-import,VirtoCommerce_vc-module-customer-review,VirtoCommerce_vc-module-customer-segments,VirtoCommerce_vc-module-demo-customer-segments,VirtoCommerce_vc-module-demo-features,VirtoCommerce_vc-module-dynamic-associations,VirtoCommerce_vc-module-elastic-search,VirtoCommerce_vc-module-event-bus,VirtoCommerce_vc-module-experience-api,VirtoCommerce_vc-module-export,VirtoCommerce_vc-module-feature-flags,VirtoCommerce_vc-module-google-ecommerce-analytics,VirtoCommerce_vc-module-image-tools,VirtoCommerce_vc-module-inventory,VirtoCommerce_vc-module-lucene-search,VirtoCommerce_vc-module-marketing,VirtoCommerce_vc-module-notification,VirtoCommerce_vc-module-order,VirtoCommerce_vc-module-pagebuilder,VirtoCommerce_vc-module-payment,VirtoCommerce_vc-module-price-export-import,VirtoCommerce_vc-module-pricing,VirtoCommerce_vc-module-profile-experience-api,VirtoCommerce_vc-module-quote,VirtoCommerce_vc-module-search,VirtoCommerce_vc-module-shipping,VirtoCommerce_vc-module-simple-export-import,VirtoCommerce_vc-module-sitemaps,VirtoCommerce_vc-module-store,VirtoCommerce_vc-module-subscription,VirtoCommerce_vc-module-tax,VirtoCommerce_vc-module-webhooks,VirtoCommerce_vc-platform,VirtoCommerce_vc-storefront,VirtoCommerce_vc-theme-b2b,VirtoCommerce_vc-theme-default';
    let queryUrl: string = `${baseUrl}?projectKeys=${componentListString}&metricKeys=${req.query.metric}`
    const componentList: ComponentInfo[] = await getCodeSmells(queryUrl);
    const pageContent: string = createPageContent(componentList, req.query.metric)
    // const name = (req.query.name || (req.body && req.body.name));
    // const responseMessage = name
    //     ? "Hello, " + name + ". This HTTP triggered function executed successfully."
    //     : "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.";

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: pageContent
    };

};

export default httpTrigger;