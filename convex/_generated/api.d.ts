/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as billing from "../billing.js";
import type * as cykris from "../cykris.js";
import type * as dr from "../dr.js";
import type * as getDr from "../getDr.js";
import type * as legacyValidators from "../legacyValidators.js";
import type * as sendEmail from "../sendEmail.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  billing: typeof billing;
  cykris: typeof cykris;
  dr: typeof dr;
  getDr: typeof getDr;
  legacyValidators: typeof legacyValidators;
  sendEmail: typeof sendEmail;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
