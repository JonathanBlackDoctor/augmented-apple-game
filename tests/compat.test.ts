import { describe, it, expect } from 'vitest';
import { detectInApp, isInAppBrowser, isMobileUA } from '../src/compat';

describe('in-app browser detection', () => {
  it('detects KakaoTalk', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 KAKAOTALK 10.4.5';
    expect(detectInApp(ua)).toEqual({ inApp: true, app: 'KakaoTalk' });
    expect(isInAppBrowser(ua)).toBe(true);
  });
  it('detects Instagram and Facebook in-app webviews', () => {
    expect(detectInApp('Mozilla/5.0 Instagram 300.0.0').app).toBe('Instagram');
    expect(detectInApp('Mozilla/5.0 [FBAN/FBIOS;FBAV/400]').app).toBe('Facebook');
  });
  it('returns false for a normal desktop browser', () => {
    expect(detectInApp('Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/120.0').inApp).toBe(false);
    expect(isInAppBrowser('Mozilla/5.0 (Macintosh) Safari/605')).toBe(false);
  });
});

describe('mobile UA detection', () => {
  it('detects Android phones and iPhones', () => {
    expect(isMobileUA('Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/120.0 Mobile')).toBe(true);
    expect(isMobileUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148')).toBe(true);
    expect(isMobileUA('Mozilla/5.0 (iPad; CPU OS 17_0) Mobile/15E148')).toBe(true);
  });
  it('returns false for desktop browsers', () => {
    expect(isMobileUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0')).toBe(false);
    expect(isMobileUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605')).toBe(false);
  });
});
