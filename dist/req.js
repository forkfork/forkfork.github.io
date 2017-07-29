window.req = function (path, args) {
  var on_success = args.on_success;
  var on_fail = args.on_fail;
  var method = args.method || 'GET';
  var xmlrequest = new XMLHttpRequest();
  xmlrequest.open(method, path, true);
  xmlrequest.onload = on_success;
  xmlrequest.onerror = on_fail;
  xmlrequest.send();
}
