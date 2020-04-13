'use strict';

const Snoowrap = require('snoowrap');
const pino = require('pino')();
const _ = require('lodash');

/**
 * Reddit
 * @class
 *
 * @property _rcredentials Reddit credentials
 * @property _r Snoowrap Instance
 */

class Reddit {
  constructor(config) {
    this._rcredentials = {
      userAgent: `${config.ua} (by u/${config.uname})`,
      clientId: config.client,
      clientSecret: config.secret,
      username: config.uname,
      password: config.password,
    };

    this._r = null;
  }

  /**
   * Initializies reddit service
   * @returns {undefined}
   */
  init() {
    pino.info('[Reddit] Initializing reddit querier...');

    this._r = new Snoowrap(this._rcredentials);
  }

  /**
   * Function to call reddit api through snoowrap
   * Searches in r/gifrecipes subreddit
   *
   * @param {String} q keyword to search
   * @param {Integer} count number of results to return
   * @returns {Object} result result set
   * @returns {String} result.title Title of recipe
   * @returns {String} result.url URL of gif
   * @returns {null} returns null when no valid result
   *                 is retrieved or error is encountered
   */
  async getRecipes(q, count = 1) {
    try {
      // Limit query on 50 items only & randomize sort option
      const results = await this._r
        .getSubreddit('gifrecipes')
        .search({ query: q, limit: 50, sort: Reddit.getRandomSort() });

      return Reddit.getRandomRecipes(results, count);
    } catch (e) {
      pino.error(e, '[Recipe] Error on querying for gif');

      return null;
    }
  }

  /**
   * Returns random sort option for reddit search
   * @returns {String}
   */
  static getRandomSort() {
    const sort = ['relevance', 'hot', 'top', 'new'];

    return sort[Math.floor(Math.random() * sort.length)];
  }

  /**
   * Returns random recipe from the result set
   *
   * @param {Array} results array of query results
   * @param {Integer} count number of random recipes
   * @returns {Array}
   */
  static getRandomRecipes(results, count) {
    const recipes = [];
    let searchCount = 0;
    const totalItems = results.length;

    while (recipes.length < count && searchCount < totalItems) {
      const randomIndex = Math.floor(Math.random() * results.length);
      const item = results[randomIndex];
      searchCount++;

      if (item.url !== null) {
        const url = this.getValidGifUrl(item);
        if (url) {
          recipes.push({
            title: item.title,
            url: item.url,
            gif: url,
          });
          results.splice(randomIndex, 1);
        }
      }
    }

    return recipes;
  }

  static isGifUrl(url) {
    return url.match(/\.(gif|gifv)$/) !== null;
  }

  static getValidGifUrl(result) {
    const { url, media } = result;
    let alternativeUrl = _.get(media, 'oembed.thumbnail_url', '');
    alternativeUrl = Reddit.isGifUrl(alternativeUrl) ? alternativeUrl : null;

    return Reddit.isGifUrl(url) ? url : alternativeUrl;
  }
}

module.exports = Reddit;
