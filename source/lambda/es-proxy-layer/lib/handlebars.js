/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

const qnabot = require('qnabot/logging');
const { signUrls } = require('./signS3URL');

// start connection
const _ = require('lodash');
const Handlebars = require('handlebars');
const { getSupportedLanguages, getLanguageErrorMessages } = require('./supportedLanguages');
const { isSafeKeyPath, DANGEROUS_SEGMENTS } = require('./keyGuard');

let res_glbl = {};
let req_glbl = {};
let hit_glbl = {};
let autotranslate;


function convertOperatorToFunc(operator) {
    switch (operator) {
    case '==':
        return (v1, v2) => (v1 == v2);
    case '===':
        return (v1, v2) => (v1 === v2);
    case '!=':
        return (v1, v2) => (v1 != v2);
    case '!==':
        return (v1, v2) => (v1 !== v2);
    case '<':
        return (v1, v2) => (v1 < v2);
    case '<=':
        return (v1, v2) => (v1 <= v2);
    case '>':
        return (v1, v2) => (v1 > v2);
    case '>=':
        return (v1, v2) => (v1 >= v2);
    case '&&':
        return (v1, v2) => (v1 && v2);
    case '||':
        return (v1, v2) => (v1 || v2);
    default:
        return (v1, v2) => false;
    }
}

Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
    const evaluationFunction = convertOperatorToFunc(operator);
    return evaluationFunction(v1, v2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifLang', function (lang, options) {
    const SessionAttributes = _.get(req_glbl, 'session');
    const usrLang = SessionAttributes.qnabotcontext.userLocale;
    if (usrLang && lang === usrLang) {
        _.set(req_glbl.session, 'matchlang', 'true');
        // Disable autotranslation, since we have an explicit language match
        autotranslate = false;
        return options.fn(this);
    }
});

Handlebars.registerHelper('defaultLang', function (options) {
    const SessionAttributes = _.get(req_glbl, 'session');
    const previousMatchLang = SessionAttributes.matchlang;

    if (previousMatchLang && previousMatchLang === 'true') {
        // case one. Hitting the default en lang response and a previous lang has matched. Return nothing and reset matchlang
        // matchlang to false for next processing. Disable autotranslation.
        _.set(req_glbl.session, 'matchlang', 'false');
        autotranslate = false;
        return options.inverse(this);
    }
    if (previousMatchLang && previousMatchLang === 'false') {
        // case two. Hitting the default lang response and a previous lang has NOT matched. Return value. matchlang is
        // false for next processing. Enable autotranslation.
        autotranslate = true;
        return options.fn(this);
    }
    // case three. Hitting the default lang response and no previous lang has been encountered. Return default value
    // but set matchlang to false for next processing. Enable autotranslation.
    _.set(req_glbl.session, 'matchlang', 'false');
    autotranslate = true;
    return options.fn(this);
});

Handlebars.registerHelper('setLang', function (lang, last, options) {
    if (!_.get(req_glbl._settings, 'ENABLE_MULTI_LANGUAGE_SUPPORT')) {
        qnabot.log('Warning - attempt to use setLang handlebar helper function while ENABLE_MULTI_LANGUAGE_SUPPORT is set to false. Please check configuration.');
        return;
    }

    const userPreferredLocaleKey = 'session.qnabotcontext.userPreferredLocale';
    const userLocaleKey = 'session.qnabotcontext.userLocale';
    const currentPreferredLocale = _.get(res_glbl, userPreferredLocaleKey);
    const currentUserLocale = _.get(res_glbl, userLocaleKey);
    const backupLanguage = _.get(res_glbl.Settings, 'BACKUP_LANGUAGE', 'English');
    const supportedLangMap = getSupportedLanguages();
    const langCode = supportedLangMap[backupLanguage];
    let errorLocale;
    if (currentPreferredLocale) {
        errorLocale = currentPreferredLocale;
    } else {
        errorLocale = currentUserLocale || langCode;
    }
    const capitalize = (s) => {
        if (typeof s !== 'string') return '';
        return s.charAt(0).toUpperCase() + s.slice(1);
    };
    const errorFound = _.get(req_glbl._event, 'errorFound');
    const userLanguage = capitalize(_.get(req_glbl._event, 'inputTranscript'));
    const languageErrorMessages = getLanguageErrorMessages();
    const userLanguageCode = supportedLangMap[userLanguage];

    if (userLanguageCode === undefined && !errorFound) {
        qnabot.log('no language mapping for user utterance');
        _.set(req_glbl._event, 'errorFound', true);
        return languageErrorMessages[errorLocale].errorMessage;
    }

    if (userLanguageCode && lang == userLanguageCode) {
        qnabot.log('Setting language - message: ', options.fn(this));
        qnabot.log('Setting req & res session attribute:', 'session.qnabotcontext.userPreferredLocale', ' Value:', userLanguageCode);
        _.set(res_glbl, userPreferredLocaleKey, userLanguageCode);
        _.set(req_glbl, userPreferredLocaleKey, userLanguageCode);
        _.set(res_glbl, userLocaleKey, userLanguageCode);
        _.set(req_glbl, userLocaleKey, userLanguageCode);
        // setLang message is already localized.. disable autotransaltion
        autotranslate = false;
        return options.fn(this);
    }
    if ((last === true) && (_.get(res_glbl, userPreferredLocaleKey) !== userLanguageCode) && !errorFound) {
        return languageErrorMessages[errorLocale].errorMessage;
    }
    return '';
});

Handlebars.registerHelper('resetLang', (msg, options) => {
    qnabot.log('reset userPreferredLocale to reenable automatic language detection');
    const userPreferredLocaleKey = 'session.qnabotcontext.userPreferredLocale';
    _.set(req_glbl, userPreferredLocaleKey, '');
    _.set(res_glbl, userPreferredLocaleKey, '');
    return msg;
});

// Safe property getter — uses _.toPath() for path parsing while blocking prototype traversal
function safeGet(obj, path, def) {
    if (!isSafeKeyPath(path)) return def;
    const parts = _.toPath(path);
    let current = obj;
    for (const part of parts) {
        if (current == null) return def;
        if (!Object.hasOwn(Object(current), part)) return def;
        current = current[part];
    }
    return current === undefined ? def : current;
}

Handlebars.registerHelper('setSessionAttr', function () {
    const args = Array.from(arguments);
    const k = args[0];
    if (_.toPath(k).some(p => DANGEROUS_SEGMENTS.has(p))) return undefined;
    // concat remaining arguments to create value
    const v_arr = args.slice(1, args.length - 1); // ignore final 'options' argument
    const v = v_arr.join(''); // concatenate value arguments
    qnabot.log('Setting res session attribute:', k, ' Value:', v);
    _.set(res_glbl.session, k, v);
    return '';
});

Handlebars.registerHelper('getQuestion', () => {
    const question = hit_glbl.questions[0].q;
    qnabot.log('Return question matched from hit: ', question);
    return question;
});

Handlebars.registerHelper('getSessionAttr', (attr, def, options) => {
    const v = safeGet(res_glbl.session, attr, def);
    qnabot.log('Return session attribute key, value: ', attr, v);
    return v;
});

Handlebars.registerHelper('getSlot', (slotname, def, options) => {
    const v = safeGet(req_glbl.slots, slotname, def);
    qnabot.log('Return slot key, value: ', slotname, v);
    return v;
});

Handlebars.registerHelper('signS3URL', (s3url, options) => {
    qnabot.log('Return signed S3 URL: ', s3url);
    // Url should already be signed. Passing as output to resolve handlebar.
    // return SafeString to prevent unwanted url escaping
    return new Handlebars.SafeString(s3url);
});

Handlebars.registerHelper('randomPick', function () {
    const argcount = arguments.length - 1; // ignore final 'options' argument
    qnabot.log('Select randomly from ', argcount, 'inputs: ', arguments);
    const item = arguments[Math.floor(Math.random() * argcount)];  // NOSONAR It is safe to use random generator here
    qnabot.log('Selected: ', item);
    return item;
});

Handlebars.registerHelper('toLowerCase', function(str) {
    if (str === null)
      return false;
  
    str = str.toString();
    return str.toLowerCase();
  });
  
  Handlebars.registerHelper('toUpperCase', function(str) {
    if (str === null)
      return false;
  
    str = str.toString();
    return str.toUpperCase();
  });
  
  Handlebars.registerHelper('toTitleCase', function(str) {
    if (str === null)
      return false;
  
    str = str.toString();
    return str.toLowerCase().split(' ').map(function (word) {
      return (word.charAt(0).toUpperCase() + word.slice(1));
    }).join(' ');
  });
  
async function replaceAsync(str, regex) {
    let m;
    let matches = [];
    while ((m = regex.exec(str)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex += 1;
        }
        matches.push(m[2]);
    }

    const signedUrls = await signUrls(matches);
    return str.replace(regex, () => `{{signS3URL '${signedUrls.shift()}'}}`);
}

// Handlebars only work synchronously so we need to sign S3 urls and replace them before passing to handlebars
async function handleSignS3(str) {
    const signS3Regex = /({{signS3URL ')(.*?)('}})/gm;
    return replaceAsync(str, signS3Regex)
        .then(replacedString => replacedString);
}

function handleSa(hit_out, hit, context) {
    hit_out.sa = [];
    hit.sa.map((obj) => {
        try {
            const sa_value = Handlebars.compile(obj.value);
            hit_out.sa.push({ text: obj.text, value: sa_value(context), enableTranslate: obj.enableTranslate });
        } catch (e) {
            qnabot.log('ERROR: Session Attributes caused Handlebars exception. Check syntax: ', obj.text);
            throw (e);
        }
    });
    return hit_out;
}

async function handleR(r, hit_out, context) {
    try {
        if (r.subTitle && r.subTitle.length > 0) {
            const subTitle_template = Handlebars.compile(r.subTitle);
            hit_out.r.subTitle = subTitle_template(context);
            if (autotranslate) {
                _.set(hit_out, 'autotranslate.r.subTitle', true);
            }
        }
        if (r.title && r.title.length > 0) {
            const title_template = Handlebars.compile(r.title);
            hit_out.r.title = title_template(context);
            if (autotranslate) {
                _.set(hit_out, 'autotranslate.r.title', true);
            }
        }
        if (r.text && r.text.length > 0) {
            const text = await handleSignS3(r.text);
            const text_template = Handlebars.compile(text);
            hit_out.r.text = text_template(context);
        }
        if (r.imageUrl && r.imageUrl.length > 0) {
            const text = await handleSignS3(r.imageUrl);
            const imageUrl_template = Handlebars.compile(text);
            hit_out.r.imageUrl = imageUrl_template(context);
        }
        if (r.url && r.url.length > 0) {
            const text = await handleSignS3(r.url);
            const url_template = Handlebars.compile(text);
            hit_out.r.url = url_template(context);
        }
        hit_out = handleButtons(r, hit_out, context);
    } catch (e) {
        qnabot.log(`ERROR: response card fields format caused Handlebars exception. Check syntax: ${e}`);
        throw (e);
    }

    return hit_out;
}

function handleButtons(r, hit_out, context) {
    if (r.buttons && r.buttons.length > 0) {
        for (let x = 0; x < r.buttons.length; x++) {
            const b_text_template = Handlebars.compile(r.buttons[x].text);
            hit_out.r.buttons[x].text = b_text_template(context);
            if (r.buttons[x].text.length > 0 && autotranslate) {
                _.set(hit_out, 'autotranslate.r.buttons[x].text', true);
            }
            const b_value_template = Handlebars.compile(r.buttons[x].value);
            hit_out.r.buttons[x].value = b_value_template(context);
            if (r.buttons[x].value.length > 0 && autotranslate) {
                _.set(hit_out, 'autotranslate.r.buttons[x].value', true);
            }
        }
    }

    return hit_out;
}

function handleRp(rp, hit_out, context) {
    try {
        const rp_template = Handlebars.compile(rp);
        hit_out.rp = rp_template(context);
        if (autotranslate) {
            _.set(hit_out, 'autotranslate.rp', true);
        }
    } catch (e) {
        qnabot.log('ERROR: reprompt caused Handlebars exception. Check syntax: ', rp);
        throw (e);
    }

    return hit_out;
}

async function handleSsml(ssml, hit_out, context) {
    try {
        const text = await handleSignS3(ssml);
        const ssml_template = Handlebars.compile(text);
        hit_out.alt.ssml = ssml_template(context).replaceAll("\n","");
        if (autotranslate) {
            _.set(hit_out, 'autotranslate.alt.ssml', true);
        }
    } catch (e) {
        qnabot.log('ERROR: SSML caused Handlebars exception. Check syntax: ', ssml);
        throw (e);
    }

    return hit_out;
}

async function handleMarkdown(markdown, hit_out, context) {
    try {
        const text = await handleSignS3(markdown);
        const markdown_template = Handlebars.compile(text);
        hit_out.alt.markdown = markdown_template(context);
        if (autotranslate) {
            _.set(hit_out, 'autotranslate.alt.markdown', true);
        }
    } catch (e) {
        qnabot.log('ERROR: Markdown caused Handlebars exception. Check syntax: ', markdown);
        throw (e);
    }

    return hit_out;
}

async function handleA(a, hit_out, context) {
    try {
        const text = await handleSignS3(a);
        const a_template = Handlebars.compile(text);
        hit_out.a = a_template(context);
        if (autotranslate) {
            _.set(hit_out, 'autotranslate.a', true);
        }
    } catch (e) {
        qnabot.log('ERROR: Answer caused Handlebars exception. Check syntax: ', a);
        throw (e);
    }

    return hit_out;
}

const apply_handlebars = async function (req, res, hit) {
    qnabot.log('apply handlebars');
    qnabot.debug(`req is: ${JSON.stringify(req, null, 2)}`);
    qnabot.debug(`res is: ${JSON.stringify(res, null, 2)}`);
    qnabot.debug(`hit is: ${JSON.stringify(hit, null, 2)}`);
    res_glbl = res; // shallow copy - allow modification by setSessionAttr helper
    req_glbl = req; // shallow copy - allow sessionAttributes retrieval by ifLang helper
    hit_glbl = hit; // shallow copy - allow getQuestion retrieval
    _.set(req_glbl._event, 'errorFound', false);
    const context = {
        LexOrAlexa: req._type,
        ClientType: req._clientType,
        UserInfo: req._userInfo,
        SessionAttributes: _.get(res, 'session'),
        Slots: _.get(req, 'slots'),
        Settings: req._settings,
        Question: req.question,
        OrigQuestion: _.get(req, '_event.origQuestion', req.question),
        PreviousQuestion: _.get(req, 'session.qnabotcontext.previous.q', false),
        Sentiment: req.sentiment,
    };
    // Autotranslation enabled by default.. will be disabled when handlebars finds explicit language match block.
    autotranslate = true;
    qnabot.debug('Apply handlebars preprocessing to ES Response. Context: ', context);
    let hit_out = _.cloneDeep(hit);
    const a = _.get(hit, 'a');
    const markdown = _.get(hit, 'alt.markdown');
    const ssml = _.get(hit, 'alt.ssml');
    const rp = _.get(hit, 'rp', _.get(req, '_settings.DEFAULT_ALEXA_REPROMPT'));
    const r = _.get(hit, 'r');
    const kendraRedirectQueryText = _.get(hit, 'kendraRedirectQueryText');
    const kendraRedirectQueryArgs = _.get(hit, 'kendraRedirectQueryArgs');

    // catch and log errors before throwing exception.
    if (a) {
        hit_out = await handleA(a, hit_out, context);
    }
    if (markdown) {
        hit_out = await handleMarkdown(markdown, hit_out, context);
    }
    if (ssml) {
        hit_out = await handleSsml(ssml, hit_out, context);
    }
    if (rp) {
        hit_out = handleRp(rp, hit_out, context);
    }
    if (r) {
        hit_out = await handleR(r, hit_out, context);
    }
    if (_.get(hit, 'sa')) {
        hit_out = handleSa(hit_out, hit, context);
    }
    if (kendraRedirectQueryText) {
        try {
            const kendraRedirectQueryText_template = Handlebars.compile(kendraRedirectQueryText);
            hit_out.kendraRedirectQueryText = kendraRedirectQueryText_template(context);
        } catch (e) {
            qnabot.log('ERROR: Answer caused Handlebars exception. Check syntax: ', kendraRedirectQueryText);
            throw (e);
        }
    }
    if (kendraRedirectQueryArgs) {
        hit_out.kendraRedirectQueryArgs = [];
        hit.kendraRedirectQueryArgs.map((arg) => {
            try {
                const arg_template = Handlebars.compile(arg);
                hit_out.kendraRedirectQueryArgs.push(arg_template(context));
            } catch (e) {
                qnabot.log('ERROR: Answer caused Handlebars exception. Check syntax: ', arg);
                throw (e);
            }
        });
    }
    qnabot.log('Preprocessed Result: ', hit_out);
    return hit_out;
};

module.exports = async function (req, res, es_hit) {
    qnabot.log('entering apply_handlebars');
    return await apply_handlebars(req, res, es_hit);
};
