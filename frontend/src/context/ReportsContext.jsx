import { createContext,useState,useEffect } from "react";
import { useAuth } from "../auth.jsx";

export const ReportsContext = createContext();

export function ReportsProvider({children}) {
  const { token,user } = useAuth();
  const [reports,setReports]=useState([]);

  async function refreshReports(){
    if(!user?.empCode) return;
    try{
      const res=await fetch(`http://127.0.0.1:5000/api/reports/hierarchy?empCode=${user.empCode}`,{
        headers:{Authorization:`Bearer ${token}`}
      });
      const data=await res.json();
      setReports(Array.isArray(data)?data:[]);
    }catch(err){console.error(err);}
  }

  useEffect(()=>{refreshReports();},[user]);

  return (
    <ReportsContext.Provider value={{reports,refreshReports}}>
      {children}
    </ReportsContext.Provider>
  );
}
