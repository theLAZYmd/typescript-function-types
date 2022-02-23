import { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosStatic } from 'axios';
import Series from 'const/sequelize/series';
import { Env, Handler } from 'modules/retrieval/retrieval.interfaces';
import { axiosBase } from 'utils/requests';
import { toFormData } from 'utils/qs';

const single: Handler<{
	link: string
}> = async (inputLink: string | any, env, options: AxiosRequestConfig = {}) => {

	// Get link ready for source.
	let link: string = '';
	if (typeof inputLink === 'string') link = inputLink;
	if (!link) link = options?.url as string;
	if (!link) link = env.link;
	if (!link) link = env.meta.directLink;
	if (env.property) link = env.meta[env.property as keyof Series];
	if (!link) throw new Error('No request link specified');

	// If it exists, fetch an axios instance from the env. Otherwise, use the default axios instance.
	let axios: AxiosInstance;
	if (env.axios) axios = env.axios;
	else axios = axiosBase;

	// Configure Axios request config copying properties from options and skipping properties starting with _.
	let config = {
		url: link
	} as AxiosRequestConfig;
	for (let [k, v] of Object.entries(options)) {
		if (!isKeyOfAxiosRequestConfig(k)) continue;

		// x-www-form-urlencoded headers (for simulating form data) need to be sent as a qs
		// https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/POST
		if (k === 'data' &&
			typeof v === 'object' &&
			options.headers &&
			options.headers['Content-Type'] === 'application/x-www-form-urlencoded'
		) {
			config.data = toFormData(v);
			continue;
		}
		
		config[k] = v;
	}
	if (env.meta?.format === 'xlsx') config.responseType = 'arraybuffer';

	return await axios(config)
		.then((r) => {
			return r.data;
		})
		.catch((e: AxiosError) => {
			if (!e.message.includes('Request')) throw e;
			throw Object.assign(e, { message: `Request with method ${e.response?.config.method} to ${e.response?.config.url} failed with status code ${e.response?.status}\n\t${e.message}` });
		});

}

export default single;

export const description = 'Downloads one data set from a URL, assuming it exists as a single complete file';

function isKeyOfAxiosRequestConfig(key: string): key is keyof AxiosRequestConfig {
	return !key.startsWith('_');
}