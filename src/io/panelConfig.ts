// Environment-aware panel config channel. The web build talks to the panel over
// Web Serial (`configSerial`); the native build goes through Rust serial commands
// (`configNative`), since WebView2 has no Web Serial. Same surface either way, so
// the Settings page is environment-agnostic.

import * as native from './configNative'
import * as web from './configSerial'
import { isNative } from './env'

export const serialSupported = () => (isNative() ? native.nativeSupported() : web.serialSupported())

export const configConnected = () => (isNative() ? native.nativeConnected() : web.configConnected())

export const reconnectConfigPort = () =>
  isNative() ? native.nativeReconnect() : web.reconnectConfigPort()

export const connectConfigPort = () =>
  isNative() ? native.nativeConnect() : web.connectConfigPort()

export const sendAcceleration = (index: number, value: number) =>
  isNative() ? native.nativeSend(index, value) : web.sendAcceleration(index, value)
