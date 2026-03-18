"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "createMetroMiddleware", {
    enumerable: true,
    get: function() {
        return createMetroMiddleware;
    }
});
function _connect() {
    const data = /*#__PURE__*/ _interop_require_default(require("connect"));
    _connect = function() {
        return data;
    };
    return data;
}
function _fetchnodeshim() {
    const data = require("fetch-nodeshim");
    _fetchnodeshim = function() {
        return data;
    };
    return data;
}
const _compression = require("./compression");
const _createEventSocket = require("./createEventSocket");
const _createMessageSocket = require("./createMessageSocket");
const _log = require("../../../../log");
const _editor = require("../../../../utils/editor");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function createMetroMiddleware(metroConfig, options) {
    const messages = (0, _createMessageSocket.createMessagesSocket)({
        logger: _log.Log
    });
    const events = (0, _createEventSocket.createEventsSocket)(messages);
    const middleware = (0, _connect().default)().use(noCacheMiddleware).use(_compression.compression)// Support opening stack frames from clients directly in the editor
    .use('/open-stack-frame', metroOpenStackFrameMiddleware)// Support status check to detect if the packager needs to be started from the native side
    .use('/status', createMetroStatusMiddleware(metroConfig, options));
    return {
        middleware,
        messagesSocket: messages,
        eventsSocket: events,
        websocketEndpoints: {
            [messages.endpoint]: messages.server,
            [events.endpoint]: events.server
        }
    };
}
const noCacheMiddleware = (req, res, next)=>{
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};
const metroOpenStackFrameMiddleware = async (req, res, next)=>{
    if (req.method !== 'POST') {
        return next();
    }
    try {
        const frame = await new (_fetchnodeshim()).Body(req).json();
        await (0, _editor.openInEditorAsync)(frame.file, frame.lineNumber);
        return res.end('OK');
    } catch  {
        res.statusCode = 400;
        return res.end('Open stack frame requires the JSON stack frame as request body');
    }
};
function createMetroStatusMiddleware(metroConfig, options) {
    return async (_req, res)=>{
        res.setHeader('X-React-Native-Project-Root', encodeURI(metroConfig.projectRoot));
        res.flushHeaders();
        await options.getMetroBundler().ready();
        res.end('packager-status:running');
    };
}

//# sourceMappingURL=createMetroMiddleware.js.map