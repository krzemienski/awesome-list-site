import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  await login(page, h);
  const bm = (await h.api('/api/bookmarks')).json;
  const fav = (await h.api('/api/favorites')).json;
  console.log('BMCHECK:', JSON.stringify({ bookmarks: Array.isArray(bm)?bm.length:bm, favorites: Array.isArray(fav)?fav.length:fav }));
  await logout(page, h);
}
