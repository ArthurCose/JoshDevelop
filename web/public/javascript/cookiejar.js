class CookieJar
{
  constructor()
  {
    let cookies = document.cookie.split("; ");
    this.cookies = {};

    for(let cookie of cookies)
    {
      cookie = cookie.split("=");

      if(cookie.length == 0 || cookie[0] == "undefined")
        continue;
      
      let key = decodeURIComponent(cookie[0]);
      let value = decodeURIComponent(cookie[1]);
      
      this.cookies[key] = value;
    }
  }

  getCookie(name)
  {
    return this.cookies[name];
  }

  setCookie(name, value)
  {
    this.cookies[name] = value;

    this.saveCookie(name, value);
  }

  saveCookie(name, value)
  {
    name = encodeURIComponent(name);
    value = encodeURIComponent(value);
    let expiration = new Date();

    expiration.setYear(
      expiration.getFullYear() + 1
    );

    document.cookie = `${name}=${value}; expires=${expiration.toString()}`;
  }
}