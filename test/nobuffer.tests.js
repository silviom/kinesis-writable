const STREAM_NAME = 'vagrant_testing';
const KinesisStream = require('../');
const AWS = require('aws-sdk');
const assert = require('chai').assert;
const kinesis = new AWS.Kinesis({
  region: 'us-west-1'
});

function get_iterator (callback) {
  kinesis.describeStream({
    StreamName: STREAM_NAME
  }, function (err, stream) {
    if (err) return callback(err);
    var params = {
      ShardId: stream.StreamDescription.Shards[0].ShardId,
      ShardIteratorType: 'LATEST',
      StreamName: STREAM_NAME
    };
    kinesis.getShardIterator(params, callback);
  });
}

function decode_record (record) {
  return JSON.parse(new Buffer(record.Data, 'base64').toString());
}

describe('without buffer', function () {
  var iterator;

  beforeEach(function (done) {
    get_iterator(function (err, data) {
      if (err) return done(err);
      iterator = data.ShardIterator;
      done();
    });
  });

  it('should work without buffering', function (done) {
    var bk = new KinesisStream({
      streamName: STREAM_NAME,
      region: 'us-west-1',
      partitionKey: 'test-123',
      buffer: false
    });

    var log_entry = JSON.stringify({foo: 'bar'});
    bk._write(log_entry, null, function () {});

    setTimeout(function () {
      kinesis.getRecords({
        ShardIterator: iterator,
        Limit: 1
      }, function (err, data) {
        if (err) return done(err);
        assert.equal(decode_record(data.Records[0]).foo, 'bar');
        done();
      });
    }, 200);

  });
});