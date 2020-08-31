const http = require('http');
const jp = require('jsonpath');
const qs = require('querystring');
const jsonData = require('./openapi.json');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
    let body = [];
    req.on('data', (chunk) => {
        body.push(chunk);
    }).on('end', () => {

        let searchRequest = '';
        try
        {
            body = Buffer.concat(body).toString();    
            let oBody = JSON.parse(body);
            let uri = oBody.url;
            let uriSegment = uri.split("/"); 
            let method = oBody.method;
            let queryString = oBody.queryString;

            var uriTemplate = '';
            var uriTemplates = jp.query(jsonData, `$.paths`);
            Object.keys(uriTemplates[0]).some(key => {
                let uriTemplateSegment = key.split("/");
                if (uriTemplateSegment.length === uriSegment.length) {
                    uriTemplateSegment.every(function(v, i) {
                        if (v.charAt(0) === '{' && v.charAt(v.length - 1) === '}')
                        {
                            //TEMPLATE
                        }
                        else if (! (v === uriSegment[i]) )
                            return false;

                        if (i === uriTemplateSegment.length -1 )
                            uriTemplate = key;
                        return true;
                    });
                }
                if (uriTemplate) 
                    return true;
            });//console.log(`uriTemplate: ${uriTemplate}`);

            if (! uriTemplate)
                throw Error('URI TEMPLATE NOT FOUND');

            let parameters = jp.query(jsonData, `$.paths["${uriTemplate}"]..${method}..parameters.*`);
            let oQueryString = qs.parse(queryString);
            Object.keys(oQueryString).forEach(function(k) {
                if (! parameters.find(o => o.name === k && o.in == "query") )
                    searchRequest += `${k} NOT FOUND, `;
            });

            if (searchRequest)
                throw Error(searchRequest);
            else
                searchRequest = 'Success: REQUEST FOUND';
        }
        catch (error)
        {
            searchRequest = error;
        }
        console.log(`Response ${searchRequest}`);
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`Request procceced`);
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});