describe('http', function() {

    // Do not use osimis.beforeEach and osimis.afterEach helpers since this is not an angular dependency.
    
    var _server = null;
    var _defaultPromiseResolver = null;

    beforeEach(function() {
        // Use native promises
        _defaultPromiseResolver = osimis.HttpRequest.Promise; // we should expect === undefined
        osimis.HttpRequest.Promise = function(resolver) {
            return new Promise(resolver);
        };

        // Mock xhr requests
        _server = sinon.fakeServer.create();
        _server.autoRespond = true; // note this keeps asynchronicity
    });

    afterEach(function() {
        // Reset promise resolver
        osimis.HttpRequest.Promise = _defaultPromiseResolver; 

        // Unset xhr mock
        _server.restore();
        _server = null;
    })

    describe('HttpRequest', function() {

        it('should handle succeeded GET requests', function() {
            // Mock xhr requests
            _server.respondWith(
                'GET',
                '/my-request',
                [
                    200,
                    {
                        "Content-Type": "application/json"
                    },
                    '{ "id": 12, "comment": "Hey there" }'
                ]
            );
            
            // Create a request
            var request = new osimis.HttpRequest();

            // Set custom headers
            request.setHeaders({
                'my-header': 'do exists'
            });

            var r1 = request
                .get('/my-request')
                .then(function(response) {
                    // Should succeed
                    // Check response
                    assert.equal(response.status, 200);
                    assert.notEqual(response.headers('MY-HEADER'), 'do exists'); // responseHeader != requestHeaders
                    assert.deepEqual(response.data, {
                        id: 12,
                        comment: 'Hey there'
                    });
                }, function(response) {
                    // Should not fail
                    assert(false);
                })
                ;

            // End test once everything has been tested
            return Promise.all([r1]);
        });

        it('should handle failed GET requests', function() {
            // Mock xhr requests
            _server.respondWith(
                'GET',
                '/my-request',
                [
                    401,
                    {
                        "Content-Type": "application/json"
                    },
                    '{ "error": 12, "comment": "Hey there" }'
                ]
            );
            
            // Create a request
            var request = new osimis.HttpRequest();

            // Set custom headers
            request.setHeaders({
                'my-header': 'do exists'
            });

            var r1 = request
                .get('/my-request')
                .then(function(response) {
                    // Should not succeed
                    assert(false);
                }, function(response) {
                    // Should succeed
                    // Check response
                    assert.equal(response.status, 401);
                    assert.deepEqual(response.data, {
                        error: 12,
                        comment: 'Hey there'
                    });
                })
                ;

            // Send all the requests from the fake backend
            _server.respond();

            // End test once everything has been tested
            return Promise.all([r1]);
        });

        it('should clone the provided header object', function() {
            // Mock xhr requests
            _server.respondWith(
                'GET',
                '/my-request',
                [
                    200,
                    {
                        "Content-Type": "application/json"
                    },
                    '{ "id": 12, "comment": "Hey there" }'
                ]
            );
            
            // Create a request
            var request = new osimis.HttpRequest();

            // Set custom headers
            var myHeaders = {
                'my-header': 'do exists'
            };
            request.setHeaders(myHeaders);

            var r1 = request
                .get('/my-request')
                .then(function(response) {
                    // Make sure we use a clone
                    assert.notEqual(request._httpHeaders, myHeaders);
                }, function(response) {
                    // Should not fail
                    assert(false);
                })
                ;

            // End test once everything has been tested
            return Promise.all([r1]);
        });
        
    });

});