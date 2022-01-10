import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import fetch from "node-fetch";

const QUALITY_GATE = 'alert_status'
const RELIABILITY = 'reliability_rating'
const SECURITY = 'security_rating'
const MAINTAINABILITY = 'sqale_rating'
const CODE_SMELLS = 'code_smells'
const COVERAGE = 'coverage'
const FULL_REPORT = 'full_report'
const GATE_FILED = 'ERROR'

const LIGHT_RED = '#FFCCCB'
const DARK_YELLOW = '#CCCC00'
const LIGHT_BLUE = '#87CEFA'
const DARK_GREEN = '#00CC66'

const SONAR_GREEN = '#6ACD6A'
const SONAR_GREEN_YELLOW = '#B0D513'
const SONAR_YELLOW = '#EABE06'
const SONAR_ORANGE = '#ED7D20'
const SONAR_RED = '#D4333F'



const metricValues: string[] = [QUALITY_GATE, RELIABILITY, SECURITY, MAINTAINABILITY, CODE_SMELLS, COVERAGE]

type ComponentInfo = 
{
    qualityGateValue: string,
    qualityGateColor: string,
    reliabilityValue: string,
    reliabilityColor: string,
    securityValue: string,
    securityColor: string,
    maintainabilityValue: string,
    maintainabilityColor: string,
    codeSmellValue: string,
    codeSmellColor: string,
    coverageValue: string,
    coverageColor: string
}

interface ComponentDict 
{ 
    [key: string]: ComponentInfo
}
interface SonarResponse
{
    metric: string,
    value: string,
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

function createComponentMetrics(componentList:string [], sonarMetricsList: SonarResponse[]){
    let componentMetrics: ComponentDict = {};
    componentList.forEach(component => {
        let filteredSonarMetricsList = sonarMetricsList.filter(metric => metric.component.includes(component));

        componentMetrics[component] = {
            qualityGateValue: filteredSonarMetricsList.find(metric => metric.metric.includes(QUALITY_GATE))?.value ? filteredSonarMetricsList.find(metric => metric.metric.includes(QUALITY_GATE)).value : null,
            qualityGateColor: null,
            reliabilityValue: filteredSonarMetricsList.find(metric => metric.metric.includes(RELIABILITY))?.value ? filteredSonarMetricsList.find(metric => metric.metric.includes(RELIABILITY)).value : null,
            reliabilityColor: null,
            securityValue: filteredSonarMetricsList.find(metric => metric.metric.includes(SECURITY))?.value ? filteredSonarMetricsList.find(metric => metric.metric.includes(SECURITY)).value : null,
            securityColor: null,
            maintainabilityValue: filteredSonarMetricsList.find(metric => metric.metric.includes(MAINTAINABILITY))?.value ? filteredSonarMetricsList.find(metric => metric.metric.includes(MAINTAINABILITY)).value : null,
            maintainabilityColor: null,
            codeSmellValue: filteredSonarMetricsList.find(metric => metric.metric.includes(CODE_SMELLS))?.value ? filteredSonarMetricsList.find(metric => metric.metric.includes(CODE_SMELLS)).value : null,
            codeSmellColor: null,
            coverageValue: filteredSonarMetricsList.find(metric => metric.metric.includes(COVERAGE))?.value ? filteredSonarMetricsList.find(metric => metric.metric.includes(COVERAGE)).value : null,
            coverageColor: null
        };
    });
    return componentMetrics;
}


function createQualityPageContent(componentList:string [], componentMetrics: ComponentDict){

    console.log("Creating Confluence Quality page content");

    Guard.AgainstNull(componentList, 'componentList');

    let pageBody: string = '';
    let rowN: number = 0;

    pageBody += '<p></p>'
    pageBody += '<table><tbody>'
    pageBody += `<tr> <th>#</th> <th>Component</th> <th>${QUALITY_GATE}</th> <th>${RELIABILITY}</th> <th>${SECURITY}</th> <th>${MAINTAINABILITY}</th> <th>${CODE_SMELLS}</th> <th>${COVERAGE}</th> </tr>`

    for(let component of componentList){
        const gateColor = componentMetrics[component].qualityGateColor ? ` bgcolor="${componentMetrics[component].qualityGateColor}"` : '';
        const coverageColor = componentMetrics[component].coverageColor ? ` bgcolor="${componentMetrics[component].coverageColor}"` : '';
        const reliabilityColor = componentMetrics[component].reliabilityColor ? ` bgcolor="${componentMetrics[component].reliabilityColor}"` : '';
        const securityColor = componentMetrics[component].securityColor ? ` bgcolor="${componentMetrics[component].securityColor}"` : '';
        const maintainabilityColor = componentMetrics[component].maintainabilityColor ? ` bgcolor="${componentMetrics[component].maintainabilityColor}"` : '';
        const codeSmellColor = componentMetrics[component].codeSmellColor ? ` bgcolor="${componentMetrics[component].codeSmellColor}"` : '';

        pageBody += `<tr> `
        pageBody += `<td>${++ rowN}</td> `
        pageBody += `<td>${component}</td> <td${gateColor}>${componentMetrics[component].qualityGateValue}</td> `
        pageBody += `<td${reliabilityColor}>${componentMetrics[component].reliabilityValue}</td> `
        pageBody += `<td${securityColor}>${componentMetrics[component].securityValue}</td> `
        pageBody += `<td${maintainabilityColor}>${componentMetrics[component].maintainabilityValue}</td> `
        pageBody += `<td${codeSmellColor}>${componentMetrics[component].codeSmellValue}</td> <td${coverageColor}>${componentMetrics[component].coverageValue}</td> `
        pageBody += `</tr>`
    }
    pageBody += '</tbody></table>';

    Guard.AgainstNull(pageBody, 'pageBody');

    pageBody += createPageLegend();

    return pageBody;
}


function createPageLegend(){

    console.log("Creating page Legend content");

    let legendBody: string = '';

    legendBody += '<p></p>'
    legendBody += '<p>CodeCoverage Legend</p>'
    legendBody += '<table><tbody>'
    legendBody += `<tr style="color:${LIGHT_RED};"><td>&#8226</td> <td>0%-29%</td></tr>`
    legendBody += `<tr style="color:${DARK_YELLOW};"><td>&#8226</td> <td>30%-49%</td></tr>`
    legendBody += `<tr style="color:${LIGHT_BLUE};"><td>&#8226</td> <td>50%-79%</td></tr>`
    legendBody += `<tr style="color:${DARK_GREEN};"><td>&#8226</td> <td>80%-100%</td></tr>`
   
    legendBody += '</tbody></table>';

    return legendBody;
}

function createPageContent(componentList: SonarResponse[], metricName: string){

    console.log("Creating Confluence page content");

    Guard.AgainstNull(componentList, 'componentList');

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

function fillColors(componentList:string [], componentMetrics: ComponentDict) {
    for(let component of componentList){
        if(componentMetrics[component].qualityGateValue === GATE_FILED ){
            componentMetrics[component].qualityGateColor = LIGHT_RED;
        }
        const reliabilityFloatValue = componentMetrics[component].reliabilityValue ? parseFloat(componentMetrics[component].reliabilityValue) : null;
        const maintainabilityFloatValue = componentMetrics[component].maintainabilityValue ? parseFloat(componentMetrics[component].maintainabilityValue) : null;
        const securityFloatValue = componentMetrics[component].securityValue ? parseFloat(componentMetrics[component].securityValue) : null;
        const codeSmellFloatValue = componentMetrics[component].codeSmellValue ? parseFloat(componentMetrics[component].codeSmellValue) : null;

        componentMetrics[component].reliabilityColor = reliabilityFloatValue != null ? calculateRatingColor(reliabilityFloatValue) : null;
        componentMetrics[component].maintainabilityColor = maintainabilityFloatValue != null ? calculateRatingColor(maintainabilityFloatValue) : null;
        componentMetrics[component].securityColor = securityFloatValue != null ? calculateRatingColor(securityFloatValue) : null;
        componentMetrics[component].codeSmellColor = codeSmellFloatValue != null ? calculateRatingColor(codeSmellFloatValue) : null;

        const coverageFloatValue = componentMetrics[component].coverageValue ? parseFloat(componentMetrics[component].coverageValue) : null;
        componentMetrics[component].coverageColor = coverageFloatValue != null ? calculateCoverageColor(coverageFloatValue) : null;
    }
    return componentMetrics;
}

function calculateCoverageColor(metricValue: number) {
    let result = LIGHT_RED;

    if (metricValue >= 30) {
        result = DARK_YELLOW;
    }
    if (metricValue >= 50) {
        result = LIGHT_BLUE;
    }
    if (metricValue >= 80) {
        result = DARK_GREEN;
    }

    return result
}

function calculateRatingColor(metricValue: number) {
    let result = LIGHT_RED;

    if (metricValue === 4.0) {
        result = SONAR_ORANGE;
    }
    if (metricValue === 3.0) {
        result = SONAR_YELLOW;
    }
    if (metricValue === 2.0) {
        result = SONAR_GREEN_YELLOW;
    }
    if (metricValue === 1.0) {
        result = DARK_GREEN;
    }

    return result
}


async function getMetricValues(sonarUrl: string) {

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
    const baseUrl = 'https://sonarcloud.io/api/measures/search';
    const componentList:string [] = ['VirtoCommerce_vc-build','VirtoCommerce_vc-demo-storefront','VirtoCommerce_vc-demo-theme-b2b','VirtoCommerce_vc-demo-theme-default','VirtoCommerce_vc-demo-xapi-app','VirtoCommerce_vc-module-assets','VirtoCommerce_vc-module-Authorize.Net','VirtoCommerce_vc-module-avatax','VirtoCommerce_vc-module-azure-search','VirtoCommerce_vc-module-bulk-actions','VirtoCommerce_vc-module-cart','VirtoCommerce_vc-module-catalog','VirtoCommerce_vc-module-catalog-csv-import','VirtoCommerce_vc-module-catalog-export-import','VirtoCommerce_vc-module-catalog-personalization','VirtoCommerce_vc-module-catalog-publishing','VirtoCommerce_vc-module-changes-collector','VirtoCommerce_vc-module-content','VirtoCommerce_vc-module-core','VirtoCommerce_vc-module-customer','VirtoCommerce_vc-module-customer-export-import','VirtoCommerce_vc-module-customer-review','VirtoCommerce_vc-module-customer-segments','VirtoCommerce_vc-module-demo-customer-segments','VirtoCommerce_vc-module-demo-features','VirtoCommerce_vc-module-dynamic-associations','VirtoCommerce_vc-module-elastic-search','VirtoCommerce_vc-module-event-bus','VirtoCommerce_vc-module-experience-api','VirtoCommerce_vc-module-export','VirtoCommerce_vc-module-feature-flags','VirtoCommerce_vc-module-google-ecommerce-analytics','VirtoCommerce_vc-module-image-tools','VirtoCommerce_vc-module-inventory','VirtoCommerce_vc-module-lucene-search','VirtoCommerce_vc-module-marketing','VirtoCommerce_vc-module-notification','VirtoCommerce_vc-module-order','VirtoCommerce_vc-module-pagebuilder','VirtoCommerce_vc-module-payment','VirtoCommerce_vc-module-price-export-import','VirtoCommerce_vc-module-pricing','VirtoCommerce_vc-module-profile-experience-api','VirtoCommerce_vc-module-quote','VirtoCommerce_vc-module-search','VirtoCommerce_vc-module-shipping','VirtoCommerce_vc-module-simple-export-import','VirtoCommerce_vc-module-sitemaps','VirtoCommerce_vc-module-store','VirtoCommerce_vc-module-subscription','VirtoCommerce_vc-module-tax','VirtoCommerce_vc-module-webhooks','VirtoCommerce_vc-platform','VirtoCommerce_vc-storefront','VirtoCommerce_vc-theme-b2b','VirtoCommerce_vc-theme-default'];
    const componentListString = componentList.toString();
    
    let responseMessage: string = `This HTTP triggered function executed successfully. Pass a 'metric' parameter in the query string or in the request body. 'metric' parameter should contain one of the ${metricValues.toString()} or ${FULL_REPORT} value`;;
    let status: number = 404;
    const metric = (req.query.metric || (req.body && req.body.metric));
    
    if (metricValues.includes(metric)) {
        const queryUrl: string = `${baseUrl}?projectKeys=${componentListString}&metricKeys=${metric}`
        const metricsList: SonarResponse[] = await getMetricValues(queryUrl);
        const pageContent: string = createPageContent(metricsList, metric);
        status = 200;
        responseMessage = pageContent;
    }

    if (metric === FULL_REPORT) {
        const queryUrl: string = `${baseUrl}?projectKeys=${componentListString}&metricKeys=${metricValues.toString()}`
        const metricsList: SonarResponse[] = await getMetricValues(queryUrl);
        let componentMetrics = createComponentMetrics(componentList,metricsList);
        componentMetrics = fillColors(componentList, componentMetrics);
        const pageContent = createQualityPageContent(componentList,componentMetrics);
        status = 200;
        responseMessage = pageContent;
    }

    context.res = {
        status: status, 
        body: responseMessage
    };

};

export default httpTrigger; 