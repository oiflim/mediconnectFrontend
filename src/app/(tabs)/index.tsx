import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { AppNotification, MedicalRecord, Medicine, Slot } from '@/lib/types';
import { prettyDateTime, roleLabel } from '@/lib/format';
import { theme } from '@/lib/theme';
import { Button, Card, Chip, EmptyState, IconButton, Loader, Screen, SectionHeading } from '@/components/ui';

export default function DashboardScreen() {
  const { user, token } = useAuth();
  const [loading,setLoading]=useState(true); const [refreshing,setRefreshing]=useState(false); const [bookings,setBookings]=useState<Slot[]>([]); const [records,setRecords]=useState<MedicalRecord[]>([]); const [medicines,setMedicines]=useState<Medicine[]>([]); const [notifications,setNotifications]=useState<AppNotification[]>([]); const [problem,setProblem]=useState('');
  const load=useCallback(async(refresh=false)=>{
    if(!token)return;
    if(refresh)setRefreshing(true);else setLoading(true);
    setProblem('');
    const role=user?.role;
    const tasks:Promise<any>[]=[];
    if(role==='patient'||role==='doctor')tasks.push(api.get<Slot[]>('/bookings/my',token).then(setBookings).catch(()=>setBookings([])));
    else if(role==='admin')tasks.push(api.get<Slot[]>('/bookings/all',token).then(setBookings).catch(()=>setBookings([])));
    if(role==='patient')tasks.push(api.get<MedicalRecord[]>('/records/my',token).then(setRecords).catch(()=>setRecords([])));
    tasks.push(api.get<Medicine[]>('/medicines?isActive=true&limit=6',token).then(setMedicines).catch(()=>setMedicines([])));
    tasks.push(api.get<AppNotification[]>('/notifications/me?limit=5',token).then(setNotifications).catch(()=>setNotifications([])));
    await Promise.all(tasks); if(refresh)setRefreshing(false);else setLoading(false);
  },[token,user?.role]);
  useFocusEffect(useCallback(()=>{load();},[load]));
  const upcoming=bookings.filter(b=>b.status==='booked'&&new Date(b.startTime)>new Date()).sort((a,b)=>+new Date(a.startTime)-+new Date(b.startTime))[0];
  const unread=notifications.filter(n=>!n.readAt).length;
  const quickActions = user?.role==='patient' ? [
    {title:'Book appointment',subtitle:'Find a doctor and a time',icon:'calendar-outline' as const,slug:'book'},
    {title:'My health records',subtitle:'Reports and prescriptions',icon:'folder-open-outline' as const,slug:'records'},
    {title:'Medicine catalogue',subtitle:'Check listed stock',icon:'medkit-outline' as const,slug:'medicines'}
  ] : user?.role==='doctor' ? [
    {title:'My appointments',subtitle:'View patient bookings',icon:'calendar-outline' as const,slug:'appointments'},
    {title:'Set availability',subtitle:'Publish appointment slots',icon:'time-outline' as const,slug:'availability'},
    {title:'Patient records',subtitle:'Find a patient by ID card',icon:'folder-open-outline' as const,slug:'records'},
    {title:'Upload prescription',subtitle:'Attach a prescription for a patient',icon:'cloud-upload-outline' as const,slug:'prescription'}
  ] : user?.role==='diagnosis_lab_manager' ? [
    {title:'Upload lab report',subtitle:'Attach a report to a patient',icon:'cloud-upload-outline' as const,slug:'upload-report'},
    {title:'Patient records',subtitle:'Review reports by ID card',icon:'folder-open-outline' as const,slug:'records'}
  ] : user?.role==='medicine_manager' ? [
    {title:'Medicine inventory',subtitle:'Manage medicine stock',icon:'medkit-outline' as const,slug:'medicines'},
    {title:'Low stock',subtitle:'Review reorder levels',icon:'alert-circle-outline' as const,slug:'low-stock'}
  ] : [
    {title:'User administration',subtitle:'Manage roles and accounts',icon:'people-outline' as const,slug:'admin-users'},
    {title:'All appointments',subtitle:'Review hospital bookings',icon:'calendar-outline' as const,slug:'appointments'},
    {title:'Medicine inventory',subtitle:'Manage catalogue and stock',icon:'medkit-outline' as const,slug:'medicines'}
  ];
  if(loading)return <Screen><Loader label="Preparing your dashboard…"/></Screen>;
  return <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>load(true)} colors={[theme.colors.primary]} tintColor={theme.colors.primary}/>}>
    <View style={styles.header}><View style={{flex:1,gap:4}}><Text style={styles.greeting}>Good {new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'},</Text><Text style={styles.name}>{user?.name?.split(' ')[0]||'there'} 👋</Text><Text style={styles.role}>{roleLabel(user?.role)}</Text></View><IconButton icon="notifications-outline" onPress={()=>router.push('/notifications')} badge={unread>0}/></View>
    <Card style={styles.hero}>
      <View style={styles.heroCopy}>
        <Chip label="MEDICONNECT CARE" tone="success"/>
        <Text style={styles.heroTitle}>Healthcare, made easier.</Text>
        <Text style={styles.heroText}>
          {user?.role==='patient'
            ? 'Keep your appointments, reports and care updates in one place.'
            : 'Your workspace is ready. Open the tools you need for today.'}
        </Text>
      </View>
      <View style={styles.heroArt}>
        <Ionicons name="heart-half" size={24} color={theme.colors.primary}/>
      </View>
      <View style={{flexDirection:'row',gap:8}}>
        <View style={styles.heroFeature}>
          <Ionicons name="shield-checkmark" color={theme.colors.primary} size={15}/>
          <Text style={styles.heroFeatureText}>Secure care</Text>
        </View>
        <View style={styles.heroFeature}>
          <Ionicons name="sparkles" color={theme.colors.primary} size={15}/>
          <Text style={styles.heroFeatureText}>AI support</Text>
        </View>
      </View>
    </Card>
    <View style={styles.statRow}>
      <Stat icon="calendar" label="Appointments" value={String(bookings.length)} />
      <Stat icon="document-text" label={user?.role==='patient'?'Records':'Medicines'} value={String(user?.role==='patient'?records.length:medicines.length)} />
      <Stat icon="notifications" label="Unread" value={String(unread)} />
    </View>
    {upcoming && (user?.role==='patient'||user?.role==='doctor') ? <Card><SectionHeading title="Next appointment" action="View all" onAction={()=>router.push('/module/appointments')}/><View style={styles.appointment}><View style={styles.dateTile}><Text style={styles.dateDay}>{new Date(upcoming.startTime).getDate()}</Text><Text style={styles.dateMonth}>{new Date(upcoming.startTime).toLocaleString(undefined,{month:'short'}).toUpperCase()}</Text></View><View style={{flex:1,gap:5}}><Text style={styles.appTitle}>{user?.role==='patient'?'Doctor visit':'Patient appointment'}</Text><Text style={styles.appText}>{prettyDateTime(upcoming.startTime)}</Text><Text style={styles.appText}>{typeof upcoming.doctorId==='object'?`Dr. ${upcoming.doctorId.name}`:'Appointment scheduled'}</Text></View><Chip label="Booked" tone="success"/></View></Card> : null}
    <View style={{gap:12}}><SectionHeading title="Quick access"/><View style={styles.actionGrid}>{quickActions.map((item)=><Pressable key={item.slug} onPress={()=>user?.role==='patient'&&item.slug==='records'?router.push('/(tabs)/records'):router.push(`/module/${item.slug}`)} style={({pressed})=>[styles.actionCard,{opacity:pressed?0.82:1}]}><View style={styles.actionIcon}><Ionicons name={item.icon} size={22} color={theme.colors.primary}/></View><Text style={styles.actionTitle}>{item.title}</Text><Text style={styles.actionSubtitle}>{item.subtitle}</Text><Ionicons name="arrow-up-right" color={theme.colors.primary} size={18} style={{position:'absolute',right:13,top:14}}/></Pressable>)}</View></View>
    {user?.role==='patient'&&records[0]?.aiPrediction?.result ? <Card><SectionHeading title="Latest AI insight"/><View style={styles.aiInsight}><Ionicons name="sparkles" size={20} color={theme.colors.primary}/><View style={{flex:1,gap:3}}><Text style={styles.appTitle}>{records[0].aiPrediction.result.prediction||'AI prediction available'}</Text><Text style={styles.appText}>A clinician must interpret this result. It is not a diagnosis.</Text></View></View></Card>:null}
    <Card style={{gap:10}}><SectionHeading title="Need a little help?"/><Text style={styles.helpText}>Ask MediConnect AI for general guidance, help finding features, or answers to common health questions.</Text><Button title="Chat with MediConnect AI" icon="sparkles" onPress={()=>router.push('/(tabs)/assistant')} /></Card>
  </Screen>;
}
function Stat({icon,label,value}:{icon:keyof typeof Ionicons.glyphMap;label:string;value:string}){return <View style={styles.stat}><View style={styles.statIcon}><Ionicons name={icon} color={theme.colors.primary} size={17}/></View><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>}
const styles=StyleSheet.create({header:{flexDirection:'row',alignItems:'center',gap:12},greeting:{fontSize:13,color:theme.colors.muted,fontWeight:'600'},name:{fontSize:27,fontWeight:'900',color:theme.colors.ink,letterSpacing:-0.7},role:{fontSize:11,color:theme.colors.primary,fontWeight:'800',textTransform:'uppercase',letterSpacing:0.8},hero:{backgroundColor:'#D5F1F4',borderColor:'#C4E8ED'},heroCopy:{flex:1,gap:7,paddingRight:56},heroTitle:{fontSize:23,fontWeight:'900',color:theme.colors.ink,letterSpacing:-0.5,maxWidth:260},heroText:{fontSize:13,color:'#45656D',lineHeight:19,maxWidth:290},heroArt:{position:'absolute',right:12,top:12,width:52,height:52,borderRadius:18,backgroundColor:'#BCEAF0',alignItems:'center',justifyContent:'center'},heroFeature:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#FFFFFFAA',paddingHorizontal:10,paddingVertical:7,borderRadius:22},heroFeatureText:{fontSize:11,color:theme.colors.ink,fontWeight:'800'},statRow:{flexDirection:'row',gap:9},stat:{flex:1,backgroundColor:'#FFFFFF',borderRadius:17,padding:12,gap:4,borderWidth:1,borderColor:'#E5F0F2'},statIcon:{width:30,height:30,borderRadius:10,backgroundColor:theme.colors.background,alignItems:'center',justifyContent:'center'},statValue:{fontSize:22,fontWeight:'900',color:theme.colors.ink},statLabel:{fontSize:10,fontWeight:'700',color:theme.colors.muted},appointment:{flexDirection:'row',alignItems:'center',gap:12},dateTile:{width:52,height:58,borderRadius:15,backgroundColor:theme.colors.surfaceSoft,alignItems:'center',justifyContent:'center'},dateDay:{fontSize:22,fontWeight:'900',color:theme.colors.primary},dateMonth:{fontSize:10,fontWeight:'900',color:theme.colors.primary},appTitle:{fontSize:14,fontWeight:'800',color:theme.colors.ink},appText:{fontSize:12,color:theme.colors.muted},actionGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},actionCard:{width:'48%',flexGrow:1,minHeight:138,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#E5F0F2',borderRadius:18,padding:14,gap:7},actionIcon:{width:40,height:40,borderRadius:13,backgroundColor:theme.colors.background,alignItems:'center',justifyContent:'center'},actionTitle:{fontSize:14,fontWeight:'800',color:theme.colors.ink},actionSubtitle:{fontSize:11,color:theme.colors.muted,lineHeight:16,maxWidth:135},aiInsight:{flexDirection:'row',gap:10,alignItems:'flex-start'},helpText:{fontSize:13,color:theme.colors.muted,lineHeight:19}});
