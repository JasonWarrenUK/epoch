/**
 * @typedef {Object} Character
 * @property {string} name
 * @property {number} birthYear
 * @property {number} deathYear
 * @property {string} location
 */

/**
 * @typedef {Object} HistoricalEvent
 * @property {number} year
 * @property {string} text
 * @property {string} [pageTitle]
 * @property {string} [pageUrl]
 * @property {number} [characterAge]
 * @property {number} [significance]
 */

/**
 * @typedef {Object} OralHistoryLayer
 * @property {string} label
 * @property {number} elderBirthYear
 * @property {HistoricalEvent} event
 */

export {};
