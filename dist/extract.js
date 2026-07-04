"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractLinks = extractLinks;
exports.extractImages = extractImages;
exports.extractScripts = extractScripts;
exports.extractStyles = extractStyles;
exports.extractEmails = extractEmails;
exports.extractIFrames = extractIFrames;
exports.extractForms = extractForms;
exports.extractJsonLd = extractJsonLd;
function extractLinks($, baseUrl) {
    const links = new Set();
    $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:'))
            return;
        try {
            links.add(new URL(href, baseUrl).href);
        }
        catch {
            links.add(href);
        }
    });
    return [...links];
}
function extractImages($, baseUrl) {
    const images = new Set();
    $('img[src]').each((_, el) => {
        const src = $(el).attr('src');
        if (!src)
            return;
        try {
            images.add(new URL(src, baseUrl).href);
        }
        catch {
            images.add(src);
        }
    });
    return [...images];
}
function extractScripts($, baseUrl) {
    const scripts = new Set();
    $('script[src]').each((_, el) => {
        const src = $(el).attr('src');
        if (!src)
            return;
        try {
            scripts.add(new URL(src, baseUrl).href);
        }
        catch {
            scripts.add(src);
        }
    });
    return [...scripts];
}
function extractStyles($, baseUrl) {
    const styles = new Set();
    $('link[rel="stylesheet"]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href)
            return;
        try {
            styles.add(new URL(href, baseUrl).href);
        }
        catch {
            styles.add(href);
        }
    });
    return [...styles];
}
function extractEmails(text) {
    const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return [...new Set(text.match(regex) || [])];
}
function extractIFrames($, baseUrl) {
    const frames = new Set();
    $('iframe[src]').each((_, el) => {
        const src = $(el).attr('src');
        if (!src)
            return;
        try {
            frames.add(new URL(src, baseUrl).href);
        }
        catch {
            frames.add(src);
        }
    });
    return [...frames];
}
function extractForms($) {
    const forms = [];
    $('form').each((_, el) => {
        const $form = $(el);
        const form = {
            action: $form.attr('action') || '',
            method: ($form.attr('method') || 'get').toUpperCase(),
            inputs: [],
        };
        $form.find('input, textarea, select').each((__, input) => {
            const $input = $(input);
            form.inputs.push({
                name: $input.attr('name') || '',
                type: $input.attr('type') || 'text',
                value: $input.attr('value') || '',
            });
        });
        forms.push(form);
    });
    return forms;
}
function extractJsonLd($) {
    const data = [];
    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            data.push(JSON.parse($(el).text()));
        }
        catch {
            // Ignorar JSON inválido
        }
    });
    return data;
}
//# sourceMappingURL=extract.js.map