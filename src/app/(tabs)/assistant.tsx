import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui';
import { theme } from '@/lib/theme';

const botpressHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/><style>
html,body,#webchat-container{height:100%;width:100%;margin:0;padding:0;overflow:hidden;background:#EAF7FB;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
.bpFab{display:none!important}.bpWebchat{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-height:100%!important;border-radius:18px!important;box-shadow:none!important}.bpContainer{height:100%!important;width:100%!important}
</style></head><body><div id="webchat-container"></div>
<script src="https://cdn.botpress.cloud/webchat/v5.0/inject.js"></script>
<script>window.botpress.on('webchat:initialized',function(){setTimeout(function(){window.botpress.open()},350)});</script>
<script src="https://files.bpcontent.cloud/2026/11/07/05/20261107050312-C9454HVO.js" defer></script>
</body></html>`;

export default function AssistantScreen(){
  const [loading,setLoading]=useState(true);const [error,setError]=useState(false);const [reloadKey,setReloadKey]=useState(0);
  const refreshAssistant=()=>{setLoading(true);setError(false);setReloadKey(key=>key+1);};
  const source=useMemo(()=>({html:botpressHtml,baseUrl:'https://files.bpcontent.cloud/'}),[]);
  return <Screen onRefresh={refreshAssistant} contentStyle={{flex:1,gap:12,paddingBottom:0}}>
    <View style={styles.top}><View style={styles.icon}><Ionicons name="sparkles" size={23} color={theme.colors.white}/></View><View style={{flex:1,gap:2}}><Text style={styles.title}>MediConnect AI</Text><Text style={styles.subtitle}>Your digital care companion</Text></View><View style={styles.online}><View style={styles.onlineDot}/><Text style={styles.onlineText}>Online</Text></View></View>
    <View style={styles.disclaimer}><Ionicons name="information-circle-outline" size={16} color={theme.colors.primary}/><Text style={styles.disclaimerText}>For general information and app guidance only. AI responses are not a medical diagnosis or emergency service.</Text></View>
    <View style={styles.webWrap}>
      <WebView key={reloadKey} source={source} originWhitelist={['*']} javaScriptEnabled domStorageEnabled sharedCookiesEnabled cacheEnabled startInLoadingState renderLoading={()=><View style={styles.loading}><ActivityIndicator color={theme.colors.primary} size="large"/><Text style={styles.subtitle}>Connecting to MediConnect AI…</Text></View>} onLoadEnd={()=>setLoading(false)} onError={()=>{setLoading(false);setError(true);}} onHttpError={()=>setError(true)} style={{flex:1,backgroundColor:theme.colors.background}} />
      {error?<View pointerEvents="none" style={styles.errorBanner}><Text style={styles.errorText}>The chat service could not load. Check your internet connection and try again.</Text></View>:null}
    </View>
  </Screen>;
}
const styles=StyleSheet.create({top:{flexDirection:'row',alignItems:'center',gap:11},icon:{width:43,height:43,borderRadius:15,backgroundColor:theme.colors.primary,alignItems:'center',justifyContent:'center'},title:{fontSize:18,fontWeight:'900',color:theme.colors.ink},subtitle:{fontSize:12,color:theme.colors.muted},online:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,paddingVertical:7,borderRadius:20,backgroundColor:'#E0F4ED'},onlineDot:{width:7,height:7,borderRadius:4,backgroundColor:'#27956E'},onlineText:{fontSize:11,color:'#277B60',fontWeight:'800'},disclaimer:{flexDirection:'row',gap:8,alignItems:'center',backgroundColor:'#DDF3F6',padding:10,borderRadius:12},disclaimerText:{fontSize:11,color:'#45656D',lineHeight:16,flex:1},webWrap:{flex:1,minHeight:250,borderRadius:18,overflow:'hidden',borderWidth:1,borderColor:'#D8E9EC',backgroundColor:theme.colors.background},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:10,backgroundColor:theme.colors.background},errorBanner:{position:'absolute',bottom:12,left:12,right:12,backgroundColor:'#FCECEC',padding:12,borderRadius:12},errorText:{fontSize:12,color:theme.colors.danger,textAlign:'center'}});
