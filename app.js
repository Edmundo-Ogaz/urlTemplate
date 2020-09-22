const http = require('http');
const jp = require('jsonpath');
const qs = require('querystring');
const jsonData = require('./openapi.json');
const amqp = require('amqplib/callback_api');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
    const { url, method } = req;//console.log(`url: ${url}`);console.log(`method: ${method}`);

    let body = [];
    req.on('data', (chunk) => 
    {
        body.push(chunk);
    }
    ).on('end', () => 
    {
        body = Buffer.concat(body).toString();    
        searchInOpenApiJson(JSON.parse(body));
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`JSON OpenApi`);
});

const consumer = () => {
    amqp.connect('amqp://hegc:sonreir.123@10.4.230.32:5672', function(error0, connection) {
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

        console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);

        channel.consume(queue, function(msg) {
            console.log(" [x] Received %s", msg.content.toString());
            searchInOpenApiJson(JSON.parse(msg.content));
        }, {
            noAck: true
        });
    });
});
}

const consumer2 = async () => {
    try {
        // const connection = await amqp.connect('amqp://hegc:sonreir.123@10.4.230.32:5672');
        const connection = await amqp.connect('amqp://localhost');
        console.log('Rabbit connected');
        
        channel = await connection.createChannel();
        console.log('Channel opened');
        
        const queue = 'messages';
        
        await channel.assertQueue(queue);
        console.log('Queue asserted');
        
        logger.info(' [*] Waiting for messages in %s. To exit press CTRL+C', queue);
        
        channel.consume(
            queue,
            function(msg) {
                console.log(` [x] Received ${msg.content.toString()}`);
                searchInOpenApiJson(JSON.parse(msg.content));
            },
            {
              noAck: true,
            },
        );
    } catch (err) {
        console.log('error', err);
    }
};

const searchInOpenApiJson = BODY => {
    let searchRequest = '';
    try
    {
        const URI = BODY.url; console.log(`uri: ${URI}`);
        const URI_SEGMENT = URI.split("/"); 
        const METHOD = BODY.method; console.log(`method: ${METHOD}`);
        const QUERYSTRING_TEMP = BODY.queryString; console.log(`queryString: ${QUERYSTRING_TEMP}`);
        const QUERYSTRING = qs.parse(QUERYSTRING_TEMP);
        // const QUERYSTRING = qs.parse(BODY.queryString); console.log(`queryString: ${QUERYSTRING}`);

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

        //REQUESTBODY
        if (METHOD === 'post' || METHOD === 'put' || METHOD === 'patch')
        {
            const SCHEMA = jp.query(jsonData, `$.paths["${uriTemplate}"]..${METHOD}.requestBody.content["application/json"].schema["$ref"]`);console.log(`schema:${SCHEMA}:`);
            const SECHEMA_SEGMENT = "#/components/schemas/Patient".split("/");
                                          //SCHEMA.split("/")
            const ENTITY = jp.query(jsonData, `$.components.schemas.${SECHEMA_SEGMENT[3]}`);console.log(`entity ${ENTITY}`)
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
    console.log(`Response ${searchRequest}`);

}

consumer();

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});