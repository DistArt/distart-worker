
var TODO_QUEUE = 'distart-todo';

var azure = require('azure-storage');

var queueSvc = azure.createQueueService();


function fetchMessage_(queue, callback) {
    queueSvc.getMessages(queue, function(error, result, response){
        if(!error){
            var message = result[0];
            if (message) {
                queueSvc.deleteMessage(queue, message.messageid, message.popreceipt, function(error, response){

                    var deserialized = JSON.parse(message.messagetext);

                    callback(deserialized, error);
                });
            } else {
                callback();
            }
        } else {
            callback(null, error);
        }
    });
}

function putMessage_(queue, message, callback) {

    // we serialize message in the simplest way possible
    var serialized = JSON.stringify(message);

    queueSvc.createMessage(queue, serialized, function(error, result, response){
        callback(error, result);
    });
}

function pushJob(jobID, callback) {
    putMessage_(TODO_QUEUE, jobID, function(error, result) {
        callback(error, result);
    })
}

function maybeCreateQueue(queue) {
    queueSvc.createQueueIfNotExists(queue, function(error, result, response){
        if(!error){
            // Queue created or exists
        }

        console.log('queue ' + queue + ' ' + (result? 'created': 'existing'));
    });
}

// sort of a touch command, to make sure queues exist
maybeCreateQueue(TODO_QUEUE);


// polls the nextJobQueue and the Azure to do Queue every second
var nextJobQueue_ = [];
function nextJobPoll_() {
    setTimeout(function () {

        console.log('new queue poll', nextJobQueue_.length);

        if (nextJobQueue_.length > 0) {
            fetchMessage_(TODO_QUEUE, function(job, error){
                if (job) {

                    (nextJobQueue_.shift())(job, error);
                }
                // if not , no new job was found, let's wait for next job queue
                nextJobPoll_();
            });
        } else {
            nextJobPoll_();
        }

    }, 1000);
}

// start queue check loop
function startPollCycle() {
    nextJobPoll_();
}

function fetchNextJob(callback) {
    nextJobQueue_.push(callback);
}

/* Commented because useless but left because usefull for information
function jobFinished(job, status, outputURL, message, callback) {
    newJob = job;
    job.status = status;
    job.outputURL = outputURL;
    job.message = message;
    putMessage_(DONE_QUEUE, newJob, function(err, result){
        callback(err, result);
    });
}
*/

// some testing
//putMessage_(TODO_QUEUE, {prop1: "hello", prop2: "dude"}, function(error, result) {
//    console.log(error, result);
//    fetchMessage_(TODO_QUEUE, function(message, error){
//        console.log(message, error)
//    });
//});

//jobFinished({jobID: 'test-id'}, 'DONE', 'fileBlobName', 'this is a message', function(err, result){
//    console.log('jobFinished', err, result);
//});
//
//fetchMessage_(DONE_QUEUE, function(job, error) {console.log('fetchMessage',job, error)});


module.exports = {
    fetchNextJob: fetchNextJob,
    pushJob: pushJob,
    startPollCycle: startPollCycle,
};