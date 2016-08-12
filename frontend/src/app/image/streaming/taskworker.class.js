(function(module) {
    'use strict';

    // Fix IE issue with window.location.origin
    // see http://tosbourn.com/a-fix-for-window-location-origin-in-internet-explorer/
    if (!window.location.origin) {
        window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
    }

    function TaskWorker(script) {
        var _this = this;

        this._workerThread = new Worker(script);

        // Send the current directory absolute path to allow file import
        this._workerThread.postMessage({
            type: 'setOrthancUrl',
            locationDirUrl: window.location.origin + window.location.pathname.replace(/[\\\/][^\\\/]*$/, ''), // remove current file from url (only keep the directory)
            orthancApiUrl: window.orthancUrl // @todo use wvConfig.orthancApiUrl instead - (we need to figure out a way to inject wvConfig in non angular code)
        });

        this._currentTask = null;

        // Used by pool to send new task once the worker is available
        this.onAvailable = new module.Listener();

        // Forward worker error or message to the current task listeners
        // Unassign the task & trigger onAvailable event once the task has finished
        this._workerThread.addEventListener('message', function(evt) {
            var task = _this._currentTask;

            switch (evt.data.type) {
            case 'success':
                // Trigger task has succeed
                task.onSucceed.trigger(evt.data);
                break;
            case 'failure':
                // Trigger task has failed
                task.onFailure.trigger(evt.data);
                break;
            default:
                throw new Error('Unknown worker response type');
            }

            // Set worker available
            _this._currentTask.onAbort.close(_this); // Close listener
            _this._currentTask = null;
            _this.onAvailable.trigger();
        }, false);

        this._workerThread.addEventListener('error', function(evt) {
            var task = _this._currentTask;

            // Trigger task has failed
            task.onFailure.trigger(evt.data);

            // Set worker available
            _this._currentTask.onAbort.close(_this); // Close listener
            _this._currentTask = null;
            _this.onAvailable.trigger();
        }, false);
    }
    
    TaskWorker.prototype.processTask = function(task) {
        var _this = this;

        // Throw exception if the worker is already busy
        if (this._currentTask) {
            throw new Error("Worker is busy");
        }

        // Assign the current task
        this._currentTask = task;

        // Listen to abortion
        task.onAbort(this, function() {
            _this._workerThread.postMessage({
                type: 'abort'
            });
        });

        // Process the task
        _this._workerThread.postMessage(task.options);
    };

    module.TaskWorker = TaskWorker;

})(window.osimis || (window.osimis = {}));