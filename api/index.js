const createApp = require("../server");

let appPromise;

module.exports = async (req, res) => {
    if (!appPromise) {
        appPromise = createApp();
    }

    const app = await appPromise;
    return app(req, res);
};