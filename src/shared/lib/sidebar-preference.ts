/** 사이드바 메뉴 묶음 이름. `SidebarGroup group`과 `soc.sidebar.group.<이름>` 저장 키에 쓴다. */
export const sidebarGroups = ["work", "org", "projects", "account"] as const;

// 첫 그림 전에 접힌 사이드바와 접힌 메뉴 묶음을 html data 속성에 적는다(수화 뒤에 접혀 메뉴가 밀리지 않게).
export const sidebarBootScript = `(function(){var d=document.documentElement.dataset;try{d.sidebarCollapsed=String(localStorage.getItem("soc.sidebar.collapsed")==="true");d.sidebarClosed=${JSON.stringify(sidebarGroups)}.filter(function(g){return localStorage.getItem("soc.sidebar.group."+g)==="true"}).join(" ")}catch(e){d.sidebarCollapsed="false";d.sidebarClosed=""}})();`;
