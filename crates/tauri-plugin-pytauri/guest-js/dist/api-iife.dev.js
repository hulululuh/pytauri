(function () {
    'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol, Iterator */


    function __classPrivateFieldGet(receiver, state, kind, f) {
        if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
        return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    }

    function __classPrivateFieldSet(receiver, state, value, kind, f) {
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
        return (state.set(receiver, value)), value;
    }

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    // Copyright 2019-2024 Tauri Programme within The Commons Conservancy
    // SPDX-License-Identifier: Apache-2.0
    // SPDX-License-Identifier: MIT
    var _Channel_onmessage, _Channel_nextMessageId, _Channel_pendingMessages;
    /**
     * Invoke your custom commands.
     *
     * This package is also accessible with `window.__TAURI__.core` when [`app.withGlobalTauri`](https://v2.tauri.app/reference/config/#withglobaltauri) in `tauri.conf.json` is set to `true`.
     * @module
     */
    /**
     * A key to be used to implement a special function
     * on your types that define how your type should be serialized
     * when passing across the IPC.
     * @example
     * Given a type in Rust that looks like this
     * ```rs
     * #[derive(serde::Serialize, serde::Deserialize)
     * enum UserId {
     *   String(String),
     *   Number(u32),
     * }
     * ```
     * `UserId::String("id")` would be serialized into `{ String: "id" }`
     * and so we need to pass the same structure back to Rust
     * ```ts
     * import { SERIALIZE_TO_IPC_FN } from "@tauri-apps/api/core"
     *
     * class UserIdString {
     *   id
     *   constructor(id) {
     *     this.id = id
     *   }
     *
     *   [SERIALIZE_TO_IPC_FN]() {
     *     return { String: this.id }
     *   }
     * }
     *
     * class UserIdNumber {
     *   id
     *   constructor(id) {
     *     this.id = id
     *   }
     *
     *   [SERIALIZE_TO_IPC_FN]() {
     *     return { Number: this.id }
     *   }
     * }
     *
     *
     * type UserId = UserIdString | UserIdNumber
     * ```
     *
     */
    // if this value changes, make sure to update it in:
    // 1. ipc.js
    // 2. process-ipc-message-fn.js
    const SERIALIZE_TO_IPC_FN = '__TAURI_TO_IPC_KEY__';
    /**
     * Transforms a callback function to a string identifier that can be passed to the backend.
     * The backend uses the identifier to `eval()` the callback.
     *
     * @return A unique identifier associated with the callback function.
     *
     * @since 1.0.0
     */
    function transformCallback(callback, once = false) {
        return window.__TAURI_INTERNALS__.transformCallback(callback, once);
    }
    let Channel$1 = class Channel {
        constructor() {
            // @ts-expect-error field used by the IPC serializer
            this.__TAURI_CHANNEL_MARKER__ = true;
            _Channel_onmessage.set(this, () => {
                // no-op
            });
            _Channel_nextMessageId.set(this, 0);
            _Channel_pendingMessages.set(this, {});
            this.id = transformCallback(({ message, id }) => {
                // the id is used as a mechanism to preserve message order
                if (id === __classPrivateFieldGet(this, _Channel_nextMessageId, "f")) {
                    __classPrivateFieldSet(this, _Channel_nextMessageId, id + 1);
                    __classPrivateFieldGet(this, _Channel_onmessage, "f").call(this, message);
                    // process pending messages
                    const pendingMessageIds = Object.keys(__classPrivateFieldGet(this, _Channel_pendingMessages, "f"));
                    if (pendingMessageIds.length > 0) {
                        let nextId = id + 1;
                        for (const pendingId of pendingMessageIds.sort()) {
                            // if we have the next message, process it
                            if (parseInt(pendingId) === nextId) {
                                // eslint-disable-next-line security/detect-object-injection
                                const message = __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[pendingId];
                                // eslint-disable-next-line security/detect-object-injection
                                delete __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[pendingId];
                                __classPrivateFieldGet(this, _Channel_onmessage, "f").call(this, message);
                                // move the id counter to the next message to check
                                nextId += 1;
                            }
                            else {
                                // we do not have the next message, let's wait
                                break;
                            }
                        }
                        __classPrivateFieldSet(this, _Channel_nextMessageId, nextId);
                    }
                }
                else {
                    __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[id.toString()] = message;
                }
            });
        }
        set onmessage(handler) {
            __classPrivateFieldSet(this, _Channel_onmessage, handler);
        }
        get onmessage() {
            return __classPrivateFieldGet(this, _Channel_onmessage, "f");
        }
        [(_Channel_onmessage = new WeakMap(), _Channel_nextMessageId = new WeakMap(), _Channel_pendingMessages = new WeakMap(), SERIALIZE_TO_IPC_FN)]() {
            return `__CHANNEL__:${this.id}`;
        }
        toJSON() {
            // eslint-disable-next-line security/detect-object-injection
            return this[SERIALIZE_TO_IPC_FN]();
        }
    };
    /**
     * Sends a message to the backend.
     * @example
     * ```typescript
     * import { invoke } from '@tauri-apps/api/core';
     * await invoke('login', { user: 'tauri', password: 'poiwe3h4r5ip3yrhtew9ty' });
     * ```
     *
     * @param cmd The command name.
     * @param args The optional arguments to pass to the command.
     * @param options The request options.
     * @return A promise resolving or rejecting to the backend response.
     *
     * @since 1.0.0
     */
    async function invoke(cmd, args = {}, options) {
        return window.__TAURI_INTERNALS__.invoke(cmd, args, options);
    }

    const PY_INVOKE_TAURI_CMD = "plugin:pytauri|pyfunc";
    const PY_INVOKE_HEADER = "pyfunc";
    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();
    /**
     * Invokes a Python function through the Tauri IPC mechanism.
     *
     * @param funcName - The name of the Python function to invoke.
     * @param body - The body to send to the Python function.
     * @returns A promise resolving or rejecting to the backend response.
     */
    async function rawPyInvoke(funcName, body) {
        const invokePromise = invoke(PY_INVOKE_TAURI_CMD, body, {
            headers: { [PY_INVOKE_HEADER]: funcName },
        });
        {
            // development-time type checking to make sure pytauri ipc implementation is correct
            return await invokePromise.then((response) => {
                if (!(response instanceof ArrayBuffer)) {
                    throw new Error("response is not ArrayBuffer. This is not your fault, \
it's a bug for pytauri, please report this issue.");
                }
                return response;
            });
        }
    }
    /**
     * Invokes a Python function through the Tauri IPC mechanism.
     *
     * This is wrapper around `rawPyInvoke` that handles JSON serialization and deserialization.
     *
     * @template T - The expected return type of the Python function.
     * @param funcName - The name of the Python function to invoke.
     * @param body - The body to send to the Python function. It will be JSON serialized.
     * @returns A promise resolving or rejecting to the backend response. It will be JSON deserialized.
     * If you dont want JSON deserialization, use `rawPyInvoke` instead.
     */
    async function pyInvoke(funcName, body) {
        let bodyEncoded;
        if (!(body instanceof ArrayBuffer) && !(body instanceof Uint8Array)) {
            const bodyJson = JSON.stringify(body);
            bodyEncoded = textEncoder.encode(bodyJson);
        }
        else {
            bodyEncoded = body;
        }
        const resp = await rawPyInvoke(funcName, bodyEncoded);
        const respJson = textDecoder.decode(resp);
        return JSON.parse(respJson);
    }
    /**
     * This class is a subclass of {@link TauriChannel}.
     * For the {@link TauriChannel} used by `pytauri`, it always transmits {@link ArrayBuffer}.
     * Therefore, this class adds the {@link addJsonListener} method to help deserialize messages.
     *
     * If you dont need that, you can use {@link TauriChannel} directly.
     *
     * @template T - The expected return type from Python.
     */
    class Channel extends Channel$1 {
        constructor() {
            super();
        }
        /**
         * Equivalent to {@link TauriChannel.onmessage}, but it JSON deserializes the message as object.
         */
        addJsonListener(handler) {
            this.onmessage = (bytes) => {
                const msgJson = textDecoder.decode(bytes);
                const response = JSON.parse(msgJson);
                handler(response);
            };
        }
    }

    var pytauri = /*#__PURE__*/Object.freeze({
        __proto__: null,
        Channel: Channel,
        pyInvoke: pyInvoke,
        rawPyInvoke: rawPyInvoke
    });

    if ("__TAURI__" in window) {
        Object.defineProperty(window.__TAURI__, "pytauri", { value: pytauri });
    }

})();
