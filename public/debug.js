window.addEventListener('error', (e) => {
  document.body.innerHTML += '<div style="position:fixed;top:0;left:0;z-index:9999;background:red;color:white;padding:20px;font-size:12px;">' + e.message + '</div>';
});
console.error = (function(old) {
  return function() {
    old.apply(this, arguments);
    document.body.innerHTML += '<div style="position:fixed;top:0;left:0;z-index:9999;background:red;color:white;padding:20px;font-size:12px;">' + Array.from(arguments).join(' ') + '</div>';
  };
})(console.error);
