import React from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppointmentsModule from '@/screens/modules/AppointmentsModule';
import BookAppointmentModule from '@/screens/modules/BookAppointmentModule';
import AvailabilityModule from '@/screens/modules/AvailabilityModule';
import EditSlotModule from '@/screens/modules/EditSlotModule';
import MedicinesModule from '@/screens/modules/MedicinesModule';
import PatientLookupModule from '@/screens/modules/PatientLookupModule';
import UploadReportModule from '@/screens/modules/UploadReportModule';
import PrescriptionModule from '@/screens/modules/PrescriptionModule';
import AdminUsersModule from '@/screens/modules/AdminUsersModule';
import { theme } from '@/lib/theme';
import { Screen, Loader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function ModuleRoute(){
  const {slug}=useLocalSearchParams<{slug:string}>();
  const {user,token,loading}=useAuth();
  if(loading)return <Screen><Loader label="Loading your workspace…"/></Screen>;
  if(!token)return <Redirect href="/(auth)/login"/>;
  const permitted:Record<string,string[]>={appointments:['patient','doctor','admin'],book:['patient'],availability:['doctor'],'edit-slot':['doctor'],records:['doctor','diagnosis_lab_manager','admin'], 'upload-report':['diagnosis_lab_manager','admin'],prescription:['doctor','admin'],'admin-users':['admin']};
  const roles=permitted[String(slug)];
  if(roles&&!roles.includes(user?.role||''))return <Redirect href="/(tabs)"/>;
  const page=slug==='appointments'?<AppointmentsModule/>:slug==='book'?<BookAppointmentModule/>:slug==='availability'?<AvailabilityModule/>:slug==='edit-slot'?<EditSlotModule/>:slug==='medicines'?<MedicinesModule/>:slug==='low-stock'?<MedicinesModule mode="low-stock"/>:slug==='expired'?<MedicinesModule mode="expired"/>:slug==='records'?<PatientLookupModule/>:slug==='upload-report'?<UploadReportModule/>:slug==='prescription'?<PrescriptionModule/>:slug==='admin-users'?<AdminUsersModule/>:null;
  if(!page)return <Screen><View style={styles.center}><Ionicons name="construct-outline" size={35} color={theme.colors.primary}/><Text style={styles.title}>This workspace is not available</Text><Pressable onPress={()=>router.back()}><Text style={styles.link}>Go back</Text></Pressable></View></Screen>;
  return <SafeAreaView style={{flex:1,backgroundColor:theme.colors.background}} edges={['top']}><View style={styles.topbar}><Pressable onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-back" size={19} color={theme.colors.ink}/></Pressable><Text style={styles.brand}>MediConnect</Text><View style={{flex:1}}/></View>{page}</SafeAreaView>;
}
const styles=StyleSheet.create({topbar:{height:52,backgroundColor:theme.colors.background,flexDirection:'row',alignItems:'center',paddingHorizontal:18,gap:10},back:{width:36,height:36,borderRadius:12,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center'},brand:{fontSize:13,fontWeight:'900',color:theme.colors.ink,letterSpacing:0.2},center:{flex:1,alignItems:'center',justifyContent:'center',gap:12},title:{fontSize:17,fontWeight:'800',color:theme.colors.ink},link:{fontSize:13,fontWeight:'800',color:theme.colors.primary}});
