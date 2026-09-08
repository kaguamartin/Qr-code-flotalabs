(function (window, document) {
  'use strict';

  var ENDPOINT = 'https://wiwlzrnlvsquszhfzaqk.supabase.co/functions/v1/track-event';
  var STORAGE_KEY = 'flota_click';
  var CONFIG_KEY = 'flota_config';
  var SENT_KEY = 'flota_sent'; // steps already reported this session, dedup guard

  function getClickId() {
    var params = new URLSearchParams(window.location.search);
    var fromUrl = params.get('_flota');
    if (fromUrl) {
      sessionStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    return sessionStorage.getItem(STORAGE_KEY);
  }

  function alreadySent(stepKey) {
    var sent = JSON.parse(sessionStorage.getItem(SENT_KEY) || '[]');
    return sent.indexOf(stepKey) !== -1;
  }

  function markSent(stepKey) {
    var sent = JSON.parse(sessionStorage.getItem(SENT_KEY) || '[]');
    sent.push(stepKey);
    sessionStorage.setItem(SENT_KEY, JSON.stringify(sent));
  }

  function report(stepKey, clickId) {
    if (!clickId || alreadySent(stepKey)) return;
    markSent(stepKey);

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ click_id: clickId, step_key: stepKey }),
      keepalive: true, // survives page navigation, important for goal_url step reports
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.ok) {
          sessionStorage.setItem(CONFIG_KEY, JSON.stringify(data));
        }
      })
      .catch(function () { /* fail silently - never break the client's site */ });
  }

  function checkGoalUrls(clickId) {
    var raw = sessionStorage.getItem(CONFIG_KEY);
    if (!raw) return;
    var config;
    try { config = JSON.parse(raw); } catch (e) { return; }
    if (config.pixel_method !== 'goal_url') return;

    var current = window.location.href;
    if (config.goal_started_url && current.indexOf(config.goal_started_url) !== -1) {
      report('signup_started', clickId);
    }
    if (config.goal_completed_url && current.indexOf(config.goal_completed_url) !== -1) {
      report('signup_completed', clickId);
    }
  }

  var clickId = getClickId();
  if (clickId) {
    report('reached_destination', clickId);
    checkGoalUrls(clickId);
  }

  // exposed for clients using the manual JS-call method:
  //   flota('track', 'signup_started')
  //   flota('track', 'signup_completed')
  window.flota = function (action, stepKey) {
    if (action !== 'track') return;
    var id = sessionStorage.getItem(STORAGE_KEY);
    if (!id) return; // this visitor didn't arrive via a tracked scan
    report(stepKey, id);
  };
})(window, document);