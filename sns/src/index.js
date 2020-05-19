import 'source-map-support/register';
import 'dotenv/config';

import http from 'http';
import express from 'express';

import {
    EventEmitter
} from 'events';
import AWS from "aws-sdk";

const events = new EventEmitter();
let awsSNS;

function sysConfig() {
    return {
        NODE_ENV: process.env.NODE_ENV,
        SERVER_PORT: process.env.SERVER_PORT,
        AWS_ACCESSKEY: process.env.AWS_ACCESSKEY,
        AWS_SECRETKEY: process.env.AWS_SECRETKEY,
        SNS_REGIONS: process.env.SNS_REGIONS,
        SNS_ARN: process.env.SNS_ARN
    };
}

function initializingServer({
    SERVER_PORT
}) {
    const app = express();
    http.createServer(app).listen(SERVER_PORT);
    console.log('Server initialized');
}

function initializingEvents() {
    events.addListener('queue.snsPublishingMessage', snsPublishingMessage);
    console.log('Events initialized');
}



function initializingAwsSNS({
    SNS_REGIONS,
    AWS_ACCESSKEY,
    AWS_SECRETKEY
}) {
    // AWS Config
    AWS.config.update({
        region: SNS_REGIONS,
        accessKeyId: AWS_ACCESSKEY,
        secretAccessKey: AWS_SECRETKEY
    });

    awsSNS = new AWS.SNS({
        apiVersion: '2010-03-31'
    });
}

export function initialize() {
    // Load System Config
    const config = sysConfig();

    // Initializing server
    initializingServer(config);

    Promise.all([
        initializingEvents(),
        initializingAwsSNS(config) // Initializing Aws
    ]);

    events.emit('queue.snsPublishingMessage', config);
}


// Function
function snsPublishingMessage({
    SNS_ARN
}) {
    let params = {
        Message: 'xxxxx',
        TopicArn: SNS_ARN //required
    };
    const snsPublishPromise = awsSNS.publish(params).promise();
    snsPublishPromise.then(data => {
        console.log(`Message ${params.Message} send sent to the topic ${params.TopicArn}`);
        console.log('MessageID is ' + data.MessageId);
    }).catch(err => {
        console.error(err, err.stack);
    });
    console.log('SNS Publishing Message');
}

initialize();