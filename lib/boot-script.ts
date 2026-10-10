// Загрузочный экран. Модуль без "use client": его импортирует серверный layout.
//
// Экран показывается один раз за сеанс и только на главной: тот, кто пришёл по прямой
// ссылке на материал, сразу видит материал. Решение принимает инлайн-скрипт в <head>
// до первой отрисовки, поэтому рабочий стол не мелькает перед заставкой.

export const BOOT_STORAGE_KEY = "campus-booted";

export const bootInitScript = `(function(){try{if(location.pathname!=="/"||sessionStorage.getItem("${BOOT_STORAGE_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches)return;sessionStorage.setItem("${BOOT_STORAGE_KEY}","1");document.documentElement.setAttribute("data-boot","")}catch(e){}})()`;
