/**
 * Helper functions to check if the request uses
 * corresponding method.
 */
const Method = (method) => (req) => req.method.toLowerCase() === method.toLowerCase();
const Get = Method('get');
const Post = Method('post');

const Path = (regExp) => (req) => {
    const url = new URL(req.url);
    const path = url.pathname;
    return path.match(regExp) && path.match(regExp)[0] === path;
};

/*
 * The regex to get the bot_token and api_method from request URL
 * as the first and second backreference respectively.
 */
const URL_PATH_REGEX = /^\/bot(?<bot_token>[^/]+)\/(?<api_method>[a-z]+)/i;

/**
 * Router handles the logic of what handler is matched given conditions
 * for each request
 */
class Router {
    constructor() {
        this.routes = [];
    }

    handle(conditions, handler) {
        this.routes.push({ conditions, handler });
        return this;
    }

    get(url, handler) {
        return this.handle([Get, Path(url)], handler);
    }

    post(url, handler) {
        return this.handle([Post, Path(url)], handler);
    }

    all(handler) {
        return this.handle([], handler);
    }

    route(req) {
        const route = this.resolve(req);
        if (route) {
            return route.handler(req);
        }

        // 404 Not Found Response
        const description = 'No matching route found';
        const error_code = 404;
        return new Response(
            JSON.stringify({
                ok: false,
                error_code,
                description,
            }),
            {
                status: error_code,
                statusText: description,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
    }

    /**
     * It returns the matching route that returns true
     * for all the conditions if any.
     */
    resolve(req) {
        return this.routes.find((r) =>
            r.conditions.every((c) => c(req))
        );
    }
}

/**
 * Sends a POST request with JSON data to Telegram Bot API
 * and reads in the response body.
 * @param {Request} request the incoming request
 */
async function handler(request) {
    const { url } = request;
    const { pathname: path, search } = new URL(url);

    // 从路径中提取 bot_token 和 api_method
    const { bot_token, api_method } = path.match(URL_PATH_REGEX).groups;

    // 构建 Telegram API 的完整 URL
    const api_url = `https://api.telegram.org/bot${bot_token}/${api_method}${search}`;

    // 提取请求体（如果是 POST 请求）
    const body = request.method.toUpperCase() === 'POST' ? await request.text() : undefined;

    // 构建 fetch 的配置对象
    const fetchOptions = {
        method: request.method,
        headers: {
            ...Object.fromEntries(request.headers),
            'Host': 'api.telegram.org' // 强制覆盖 Host 头
        },
        body
    };

    // 发送请求到 Telegram API
    const response = await fetch(api_url, fetchOptions);

    // 构建返回的 Response
    const result = await response.text();
    return new Response(result, {
        status: response.status,
        statusText: response.statusText,
        headers: {
            'Content-Type': response.headers.get('content-type') || 'application/json',
        }
    });
}

/**
 * Handles the incoming request.
 * @param {Request} request the incoming request.
 */
async function handleRequest(request) {
    const r = new Router();
    r.get(URL_PATH_REGEX, handler);
    r.post(URL_PATH_REGEX, handler);

    const resp = await r.route(request);
    return resp;
}

/**
 * Hook into the fetch event.
 */
addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event.request));
});
