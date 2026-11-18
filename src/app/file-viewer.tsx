import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useAuth } from '@/context/AuthContext';
import { Screen, Loader } from '@/components/ui';
import { API_BASE_URL } from '@/lib/api';
import { theme } from '@/lib/theme';

export default function FileViewer(){
  const {recordId,title}=useLocalSearchParams<{recordId:string;title:string}>();const {token,loading}=useAuth();
  if(loading)return <Screen><Loader label="Checking secure access…"/></Screen>;
  if(!token)return <Redirect href="/(auth)/login"/>;
  return <View style={styles.screen}><View style={styles.header}><Pressable onPress={()=>router.back()} style={styles.back}><Ionicons name="close" size={22} color={theme.colors.ink}/></Pressable><Text numberOfLines={1} style={styles.title}>{title||'Medical file'}</Text></View><WebView source={{uri:`${API_BASE_URL}/records/${recordId}/file`,headers:token?{Authorization:`Bearer ${token}`}:{}}} originWhitelist={['http://*','https://*']} startInLoadingState javaScriptEnabled style={{flex:1,backgroundColor:theme.colors.background}} /></View>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:theme.colors.background},header:{paddingTop:52,paddingHorizontal:16,paddingBottom:12,flexDirection:'row',gap:12,alignItems:'center',backgroundColor:'#FFFFFF'},back:{width:38,height:38,borderRadius:12,backgroundColor:theme.colors.background,alignItems:'center',justifyContent:'center'},title:{fontSize:16,fontWeight:'800',color:theme.colors.ink,flex:1}});
