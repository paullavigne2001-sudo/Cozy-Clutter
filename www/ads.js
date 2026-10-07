// Couche pubs : fausses pubs dans le navigateur, AdMob dans l'appli Android.
// Les identifiants ci-dessous sont les identifiants de TEST de Google. Remplace-les par les tiens avant la publication.
const Ads=(()=>{
  const cap=window.Capacitor;
  const P=cap&&cap.Plugins&&cap.Plugins.AdMob;
  const native=!!(cap&&cap.isNativePlatform&&cap.isNativePlatform()&&P);
  const IDS={interstitial:"ca-app-pub-3940256099942544/1033173712",rewarded:"ca-app-pub-3940256099942544/5224354917"};
  const el=id=>document.getElementById(id);
  function fake(secs){
    return new Promise(res=>{
      const m=el("fakead"),t=el("fakeTxt");let n=secs;
      m.classList.add("on");t.textContent="Fin dans "+n+" s";
      const iv=setInterval(()=>{n--;t.textContent="Fin dans "+n+" s";if(n<=0){clearInterval(iv);m.classList.remove("on");res();}},1000);
    });
  }
  async function init(){
    if(!native)return;
    try{
      await P.initialize({initializeForTesting:true});
      const c=await P.requestConsentInfo();
      if(c.isConsentFormAvailable&&c.status==="REQUIRED")await P.showConsentForm();
    }catch(e){console.warn("AdMob init",e);}
  }
  async function interstitial(){
    if(!native){await fake(2);return;}
    try{await P.prepareInterstitial({adId:IDS.interstitial});await P.showInterstitial();}catch(e){console.warn(e);}
  }
  // Renvoie true si le joueur a gagné la récompense.
  async function rewarded(){
    if(!native){await fake(3);return true;}
    try{await P.prepareRewardVideoAd({adId:IDS.rewarded});const r=await P.showRewardVideoAd();return !!r;}
    catch(e){console.warn(e);return false;}
  }
  async function privacy(){
    if(native){try{await P.showConsentForm();}catch(e){}}
    else alert("Disponible dans l'application Android.");
  }
  return{init,interstitial,rewarded,privacy};
})();
