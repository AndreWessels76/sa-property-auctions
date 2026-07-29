"use client";

import { useState } from "react";

export default function NotificationSettings(){

    const [emailAlerts,setEmailAlerts]=

        useState(true);

    const [pushAlerts,setPushAlerts]=

        useState(true);

    return(

        <div className="rounded-xl border bg-white p-6">

            <h2>

                Notifications

            </h2>

            <label>

                <input

                    type="checkbox"

                    checked={emailAlerts}

                    onChange={()=>setEmailAlerts(!emailAlerts)}

                />

                Email Alerts

            </label>

            <br/>

            <label>

                <input

                    type="checkbox"

                    checked={pushAlerts}

                    onChange={()=>setPushAlerts(!pushAlerts)}

                />

                Push Notifications

            </label>

        </div>

    );

}
