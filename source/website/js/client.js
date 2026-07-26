/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */
import app from './client.vue';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@fontsource/material-icons';
import { createApp } from 'vue';
import * as Vue from 'vue';
import { aliases, md } from 'vuetify/iconsets/md';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { createVuetify } from 'vuetify';
import * as Vuetify from 'vuetify';
import { createStore } from 'vuex';
import * as Vuex from 'vuex';
import 'vuetify/styles';
import axios from 'axios';
import 'aws-lex-web-ui/dist/lex-web-ui.min.css';
import Auth from './lib/client-auth';

// aws-lex-web-ui's UMD wrapper calls require("Vue")/require("Vuetify")/require("Vuex").
// There's no native require() in the browser, so shim it here at module top-level,
// before the dynamic import of aws-lex-web-ui below can invoke it.
globalThis.Vue = globalThis.Vue || Vue;
globalThis.Vuetify = globalThis.Vuetify || Vuetify;
globalThis.Vuex = globalThis.Vuex || Vuex;
globalThis.require = globalThis.require || ((name) => {
    const externalModules = { Vue: globalThis.Vue, Vuetify: globalThis.Vuetify, Vuex: globalThis.Vuex };
    if (name in externalModules) {
        return externalModules[name];
    }
    throw new Error(`Cannot resolve module "${name}"`);
});

let store = null;
let authConfig = null;

const config = {
    cognito: {},
    lex: {
        initialText: 'Ask a Question',
        initialSpeechInstruction: '',
        reInitSessionAttributesOnRestart: false,
    },
    ui: {
        pageTitle: 'QnABot Client',
        toolbarColor: 'cyan',
        toolbarTitle: 'QnABot',
        toolbarLogo: null,
        pushInitialTextOnRestart: false,
        showDialogStateIcon: false,
        shouldDisplayResponseCardTitle: false,
        positiveFeedbackIntent: 'Thumbs up',
        negativeFeedbackIntent: 'Thumbs down',
        helpIntent: 'Help',
        messageMenu: true,
    },
    recorder: {},
};

const checkExpiringSessionPlugin = {
    install() {
        // Compute the session timeout (in milliseconds) using the
        // difference between the current timestamp and the expiration timestamp
        const sessionTimeout = authConfig.credentials.expiration - Date.now();

        if (sessionTimeout > 0) {
            setTimeout(() => {
                // Note: This is a workaround for the fact that the underlying
                // lex-web-ui library does not currently support refreshing
                // the session token.
                // Tell the user to manually start a new session when the current
                // session has expired.
                store.dispatch(
                    'pushErrorMessage',
                    'Your session has expired. Please start a new session.',
                );
            }, sessionTimeout);
        }
    },
};

document.addEventListener('DOMContentLoaded', () => {
    const Config = Promise.resolve(axios.head(window.location.href))
        .then((result) => {
            const stage = result.headers['api-stage'];
            return Promise.resolve(axios.get(`/${stage}`)).then((x) => x.data);
        })
        .then((result) => {
            config.cognito.poolId = result.PoolId;
            config.cognito.appUserPoolName = result.UserPool;
            config.lex.botName = result.BotName;
            config.lex.botAlias = result.BotVersion;
            config.lex.v2BotId = result.v2BotId;
            config.lex.v2BotAliasId = result.v2BotAliasId;
            config.lex.v2BotLocaleId = result.v2BotLocaleId;
            if (result?.StreamingWebSocketEndpoint) {
                config.lex.allowStreamingResponses = true
                config.lex.streamingWebSocketEndpoint = result.StreamingWebSocketEndpoint
            }
            return config;
        });

    Promise.all([
        Config,
        Auth(),
    ])
        .then(async (results) => {
            const configResult = results[0];
            const auth = results[1];
            const LexWebUi = await import('aws-lex-web-ui/dist/lex-web-ui.min.js');
            const App = createApp(app);
            const vuetify = createVuetify({
                components,
                directives,
                icons: {
                    defaultSet: 'md',
                    aliases,
                    sets: {
                        md,
                    },
                },
            });
            App.use(vuetify);
            store = createStore(LexWebUi.Store);
            App.use(store);
            if (auth.username) {
                config.ui.toolbarTitle += ` [${auth.username}]`;
            }
            config.lex.sessionAttributes = {
                idtokenjwt: auth.idtoken,
            };
            authConfig = auth.config;
            App.use(LexWebUi.Plugin, {
                config: configResult,
                awsConfig: auth.config,
                lexRuntimeClient: auth.lexV1,
                LexRuntimeV2Client: auth.lexV2,
                pollyClient: auth.polly,
            });
            App.use(checkExpiringSessionPlugin);
            App.mount('#App');
        });
});
