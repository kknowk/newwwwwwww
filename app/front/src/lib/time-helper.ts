export function fromUTCSecondsToDate(value: number): Date {
  return new Date(value * 1000);
}

export function showTimeDiff(utcFrom: number, now: number) {
  if (utcFrom === now) {
    return 'now';
  }
  const parts = ['', '', utcFrom > now ? 'later' : 'ago'];
  let diff = utcFrom > now ? utcFrom - now : now - utcFrom;
  if (diff < 60) {
    parts[0] = diff.toString();
    parts[1] = 'seconds';
  } else if (diff < 3600) {
    parts[0] = Math.ceil(diff / 60).toString();
    parts[1] = 'minutes';
  } else if (diff < 86400) {
    parts[0] = Math.ceil(diff / 3600).toString();
    parts[1] = 'hours';
  } else if (diff < 1209600) {
    parts[0] = Math.ceil(diff / 86400).toString();
    parts[1] = 'days';
  } else if (diff < 5184000) {
    parts[0] = Math.ceil(diff / 604800).toString();
    parts[1] = 'weeks';
  } else {
    let months = Math.ceil(diff / 2592000);
    parts[1] = 'months';
    if (months >= 12) {
      const years = Math.floor(months / 12);
      months -= years * 12;
      if (months === 0) {
        parts[0] = years.toString();
        parts[1] = 'years';
      } else {
        parts[0] = months.toString();
        parts.unshift('years');
        parts.unshift(years.toString());
      }
    } else {
      parts[0] = months.toString();
    }
  }
  return parts.join(' ');
}
