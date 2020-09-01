const jp = require('jsonpath');
const qs = require('querystring');
const amqp = require('amqplib/callback_api');
const log = require('simple-node-logger').createSimpleLogger('outputs.log');

const jsonData = require('./openapi.json');

log.setLevel('debug');

//amqp.connect('amqp://hegc:sonreir.123@10.4.230.32:5672', function(error0, connection) {
amqp.connect('amqp://localhost', function(error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function(error1, channel) {
        if (error1) {
            throw error1;
        }
        var queue = 'openapiDev';
        channel.assertQueue(queue, {
            durable: false
        });
        log.debug('[*] Waiting for messages in %s. To exit press CTRL+C ', queue);
        channel.consume(queue, function(msg) {
            log.debug('[x] Received ', msg.content.toString());
            searchInOpenApiJson(JSON.parse(msg.content));
        }, {
            noAck: true
        });
    });
});

const searchInOpenApiJson = REQUEST => {
    let searchRequest = '';
    try
    {
        const URI = REQUEST.url; log.debug('uri: ', URI);
        const URI_SEGMENT = URI.split("/"); 
        const METHOD = REQUEST.method; log.debug('method: ', METHOD);
        const QUERYSTRING_TEMP = REQUEST.queryString; log.debug('queryString: ', QUERYSTRING_TEMP);
        const QUERYSTRING = qs.parse(QUERYSTRING_TEMP); log.debug('queryString object: ', QUERYSTRING);
        const BODY = REQUEST.body; log.debug('body: ', BODY);

        let uriTemplate = '';
        const PATHS = jp.query(jsonData, `$.paths`);
        Object.keys(PATHS[0]).some(key => {
            const URI_TEMPLATE_SEGMENTS = key.split("/");
            if (URI_TEMPLATE_SEGMENTS.length === URI_SEGMENT.length) {
                URI_TEMPLATE_SEGMENTS.every(function(v, i) {
                    if (v.charAt(0) === '{' && v.charAt(v.length - 1) === '}')
                    {
                        //TEMPLATE
                    }
                    else if (! (v === URI_SEGMENT[i]) )
                        return false;

                    if (i === URI_TEMPLATE_SEGMENTS.length -1 )
                        uriTemplate = key;
                    return true;
                });
            }
            if (uriTemplate) 
                return true;
        });

        if (! uriTemplate)
            throw Error('URI TEMPLATE NOT FOUND');

        //QUERYSTRING
        const PARAMETERS = jp.query(jsonData, `$.paths["${uriTemplate}"]..${METHOD}..parameters.*`);
        Object.keys(QUERYSTRING).forEach(function(k) {
            if (! PARAMETERS.find(o => o.name === k && o.in == "query") )
                searchRequest += `${k} NOT FOUND, `;
        });

        //BODY
        if (BODY)
        {
            const PATH_ENTITY = jp.query(jsonData, `$.paths["${uriTemplate}"]..${METHOD}.requestBody.content["application/json"].schema["$ref"]`);console.log(`schema:${PATH_ENTITY}:`);
            const PATH_ENTITY_SEGMENT = PATH_ENTITY[0].split("/");
            const PROPERTIES = jp.query(jsonData, `$.components.schemas.${PATH_ENTITY_SEGMENT[3]}.properties`);console.log(`properties ${PROPERTIES}`)
            Object.keys(BODY).forEach(k => {
                if (! (k in PROPERTIES[0]))
                    searchRequest += `${k} NOT FOUND, `;
            });
        }

        if (searchRequest)
            throw Error(searchRequest);
        else
            searchRequest = 'Success: REQUEST FOUND IN OPENAPI JSON';
    }
    catch (error)
    {
        searchRequest = error;
    }
    log.debug('Response ', searchRequest);
}