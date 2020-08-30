const http = require('http');
const jp = require('jsonpath');
const qs = require('querystring');
const jsonData = require('./openapi.json');

const hostname = '127.0.0.1';
const port = 3000;

const cities = [
    { name: "London", "population": 8615246 },
    { name: "Berlin", "population": 3517424 },
    { name: "Madrid", "population": 3165235 },
    { name: "Rome",   "population": 2870528 }
  ];

const server = http.createServer((req, res) => {
  const { method, url } = req;
//   console.log(method);
//   console.log(url);

  let body = [];
  req.on('data', (chunk) => {
    body.push(chunk);
  }).on('end', () => {
    body = Buffer.concat(body).toString();//console.log(body);
    
    let oBody = JSON.parse(body);
    let uri = oBody.url;console.log(uri);let aUri = uri.split("/"); 
    let method = oBody.method;console.log(method);
    let queryString = oBody.queryString;console.log(queryString);

    var uriTemplates = jp.query(jsonData, `$.paths`);//console.log(uriTemplates);
    Object.keys(uriTemplates[0]).forEach(key => {console.log(`key: ${key}`);console.log(`uri: ${uri}`);
        aUriTemplate = key.split("/");
        if (aUriTemplate.length === aUri.length) {
            aUriTemplate.every(function(v, i) {console.log(`v: ${v} aUri[i]: ${aUri[i]} compare: ${v === aUri[i]}`)
                if (v.charAt(0) === '{' && v.charAt(v.length - 1) === '}')
                {
                    console.log(`TEMPLATE: ${v}`)
                    //TEMPLATE
                }
                else if (! (v === aUri[i]) )
                {
                    console.log(`return`)
                    return false;
                }

                if (i === aUriTemplate.length -1 )
                {
                    uriTemplate = key;console.log(uriTemplate);
                    return false;
                }
                return true;
            });
        }
        //if (uriTemplate) break;
        //aUriTemplates.push(key);//console.log(key);
    });console.log(`uriTemplate: ${uriTemplate}`);

    var parameters = jp.query(jsonData, `$.paths["${uriTemplate}"]..${method}..parameters.*`);
    let oQueryString = qs.parse(queryString);
    Object.keys(oQueryString).forEach(function(key) {console.log(key);
        if ( parameters.find(o => o.name === key && o.in == "query") ) {
            console.log(`exist ${key}`);
        }
        else
        {
            console.log(`not exist ${key}`);
        }
      });
  });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end(`Hello World`);
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});