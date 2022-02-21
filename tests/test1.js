const { expect } = require('chai');
const getTypes = require('../lib/index').default;

describe('Run each sample file in \'test-samples\' through the lib/index library and expect to receive type data out as a result', function () {

	it('should return a type data object', function () {
		const path = './test-samples/sample-1-prototype.ts';
		const typeData = getTypes(path);
		expect(typeData).to.be.an('object');
	});
});