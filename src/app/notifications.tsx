import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { AppNotification } from '@/lib/types';
import { prettyDateTime } from '@/lib/format';
import { theme } from '@/lib/theme';
import { Button, Card, EmptyState, PageTitle, Screen, Loader } from '@/components/ui';

export default function NotificationsScreen(){
  const {token,loading:authLoading}=useAuth();const [items,setItems]=useState<AppNotification[]>([]);const [loading,setLoading]=useState(true);const [pushBusy,setPushBusy]=useState(false);const [error,setError]=useState('');
  const load=useCallback(async(refresh=false)=>{if(!token)return;if(!refresh)setLoading(true);setError('');try{setItems(await api.get<AppNotification[]>('/notifications/me?limit=100',token));}catch(e:any){setError(e.message);}finally{if(!refresh)setLoading(false);}},[token]);
  useFocusEffect(useCallback(()=>{if(token)load();},[load,token]));
  if(authLoading)return <Screen><Loader label="Loading your account…"/></Screen>;
  if(!token)return <Redirect href="/(auth)/login"/>;
  const markRead=async(id:string)=>{try{await api.patch(`/notifications/${id}/read`,{},token);setItems(x=>x.map(i=>i._id===id?{...i,readAt:new Date().toISOString()}:i));}catch(e:any){Alert.alert('Unable to update',e.message);}};
  const markAll=async()=>{try{await api.patch('/notifications/read-all',{},token);setItems(x=>x.map(i=>({...i,readAt:i.readAt||new Date().toISOString()})));}catch(e:any){Alert.alert('Unable to update',e.message);}};
  const remove=async(id:string)=>{try{await api.delete(`/notifications/${id}`,token);setItems(x=>x.filter(i=>i._id!==id));}catch(e:any){Alert.alert('Unable to delete',e.message);}};
  const enablePush=async()=>{setError('');try{setPushBusy(true);const permission=await Notifications.requestPermissionsAsync();if(!permission.granted){setError('Notification permission was not granted. Enable notifications in device settings.');return;}const projectId=Constants.expoConfig?.extra?.eas?.projectId;if(!projectId||projectId==='REPLACE_WITH_EAS_PROJECT_ID'){setError('Add your EAS projectId to app.json before registering push notifications.');return;}const tokenResult=await Notifications.getExpoPushTokenAsync({projectId});await api.post('/notifications/device-token',{token:tokenResult.data},token);Alert.alert('Notifications enabled','This device is registered for MediConnect push notifications.');}catch(e:any){setError(e.message||'Could not register this device.');}finally{setPushBusy(false);}};
  if(loading)return <Screen><Loader label="Loading notifications…"/></Screen>;
  return <Screen onRefresh={()=>load(true)}><View style={styles.header}><Pressable onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={theme.colors.ink}/></Pressable><View style={{flex:1}}><PageTitle title="Notifications" subtitle="Appointment and medical record updates."/></View></View>
    <Button title="Enable push on this device" icon="notifications-outline" secondary compact loading={pushBusy} onPress={enablePush}/>{error?<Text style={styles.error}>{error}</Text>:null}
    {items.some(i=>!i.readAt)?<Pressable onPress={markAll} style={{alignSelf:'flex-end'}}><Text style={styles.markAll}>Mark all as read</Text></Pressable>:null}
    {items.length===0?<Card><EmptyState title="You're all caught up" message="New notifications will appear here when there are updates to your care." icon="notifications-off-outline"/></Card>:items.map(item=><Card key={item._id} style={{opacity:item.readAt?0.75:1}}><View style={styles.itemTop}><View style={[styles.itemIcon,{backgroundColor:item.readAt?'#EDF2F3':theme.colors.surfaceSoft}]}><Ionicons name={item.type==='appointment'?'calendar-outline':item.type==='medical_record'?'document-text-outline':'notifications-outline'} size={18} color={theme.colors.primary}/></View><View style={{flex:1,gap:3}}><Text style={styles.title}>{item.title}</Text><Text style={styles.meta}>{prettyDateTime(item.createdAt)}</Text></View>{!item.readAt?<View style={styles.unread}/>:null}</View><Text style={styles.body}>{item.body}</Text><View style={styles.actions}>{!item.readAt?<Pressable onPress={()=>markRead(item._id)}><Text style={styles.action}>Mark read</Text></Pressable>:null}<Pressable onPress={()=>remove(item._id)}><Text style={[styles.action,{color:theme.colors.danger}]}>Delete</Text></Pressable></View></Card>)}
  </Screen>;
}
const styles=StyleSheet.create({header:{flexDirection:'row',gap:10,alignItems:'center'},back:{width:40,height:40,borderRadius:13,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center'},error:{fontSize:12,color:theme.colors.danger},markAll:{fontSize:12,color:theme.colors.primary,fontWeight:'800'},itemTop:{flexDirection:'row',alignItems:'center',gap:10},itemIcon:{width:40,height:40,borderRadius:14,alignItems:'center',justifyContent:'center'},title:{fontSize:14,fontWeight:'800',color:theme.colors.ink},meta:{fontSize:11,color:theme.colors.muted},body:{fontSize:13,color:theme.colors.ink,lineHeight:19},actions:{flexDirection:'row',justifyContent:'flex-end',gap:17},action:{fontSize:12,fontWeight:'800',color:theme.colors.primary},unread:{width:8,height:8,borderRadius:4,backgroundColor:theme.colors.highlight}});
