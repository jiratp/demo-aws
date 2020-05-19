import 'source-map-support/register';
import 'dotenv/config';

import http from 'http';
import express from 'express';

import {
    EventEmitter
} from 'events';
import AWS from "aws-sdk";

const events = new EventEmitter();
let awsSQS;

function sysConfig() {
    return {
        NODE_ENV: process.env.NODE_ENV,
        SERVER_PORT: process.env.SERVER_PORT,
        AWS_ACCESSKEY: process.env.AWS_ACCESSKEY,
        AWS_SECRETKEY: process.env.AWS_SECRETKEY,
        SQS_REGIONS: process.env.SQS_REGIONS,
        SQS_ENDPOINT: process.env.SQS_ENDPOINT
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
    events.addListener('queue.sqsReceiveMessage', sqsReceiveMessage);
    events.addListener('queue.sqsDeleteMessage', sqsDeleteMessage);
    console.log('Events initialized');
}

function initializingAwsSQS({
    SQS_REGIONS,
    AWS_ACCESSKEY,
    AWS_SECRETKEY
}) {

    // AWS Config
    AWS.config.update({
        region: SQS_REGIONS,
        accessKeyId: AWS_ACCESSKEY,
        secretAccessKey: AWS_SECRETKEY
    });

    awsSQS = new AWS.SQS({
        apiVersion: '2012-11-05'
    });
}

export function initialize() {
    // Load System Config
    const config = sysConfig();

    // Initializing server
    initializingServer(config);

    Promise.all([
        initializingEvents(),
        initializingAwsSQS(config) // Initializing Aws
    ]);

    workerScheduleTime(config);
}

function workerScheduleTime({
    SQS_ENDPOINT
}) {
    setInterval(() => {
        events.emit('queue.sqsReceiveMessage', SQS_ENDPOINT);
    }, 10000);
}

// Function
function sqsReceiveMessage(SQS_ENDPOINT) {
    awsSQS.receiveMessage({
        QueueUrl: SQS_ENDPOINT,
        AttributeNames: ['SentTimestamp', 'SequenceNumber'],
        MaxNumberOfMessages: 1, // ['Amazon SQS never returns more messages than this value','Valid values: 1 to 10. Default: 1.','Required: No'] 
        MessageAttributeNames: ['All'], // When using ReceiveMessage, you can send a list of attribute names to receive, or you can return all of the attributes by specifying All or .* in your request. You can also use all message attributes starting with a prefix, for example bar.*.
        //VisibilityTimeout: 10, //The duration (in seconds) that the received messages are hidden from subsequent retrieve requests after being retrieved by a ReceiveMessage request.
        WaitTimeSeconds: 10 //The duration (in seconds) for which the call waits for a message to arrive in the queue before returning. If a message is available, the call returns sooner than WaitTimeSeconds. If no messages are available and the wait time expires, the call returns successfully with an empty list of messages.
    }, (err, body) => {
        if (err) console.log('SQS receive message error!!!');
        // TO DO Function

        if (body.Messages != undefined && body.Messages.length > 0) {
            console.log('------ Receive Message ------');
            console.log('SQS receive message success');
            events.emit('queue.sqsDeleteMessage', SQS_ENDPOINT, body.Messages[0].ReceiptHandle);
        }
    });
}

function sqsDeleteMessage(SQS_ENDPOINT, ReceiptHandle) {
    console.log('------ Delete Message ------');

    awsSQS.deleteMessage({
        QueueUrl: SQS_ENDPOINT,
        ReceiptHandle: ReceiptHandle
    }, (err, body) => {
        if (err) console.log('SQS delete message error!!!');
        console.log('SQS delete message success', body);
    });
}


initialize();