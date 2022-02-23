const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const getTypes = require('../lib/index').default;

describe('Run each sample file in \'test-samples\' through the lib/index library and expect to receive type data out as a result', function () {

	it('check types of test-samples/sample*', function () {

		const sampleDir = './test-samples/';
		const files = fs.readdirSync(sampleDir);
		for (let f of files) {
			if (!f.endsWith('.ts')) continue;
			if (!f.startsWith('sample-')) continue;
			if (process.env.nb) {
				if (!f.startsWith('sample-' + process.env.nb)) continue;
			}

			let typeData = getTypes([path.resolve(sampleDir, f)]);
			expect(typeData).to.be.an('array');

			let outputFile = path.resolve(sampleDir, f.replace('.ts', '.json'));
			// let output = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
			// expect(typeData).to.deep.equal(output);
			fs.writeFileSync(outputFile, JSON.stringify(typeData, null, 2));
		}
	});
});