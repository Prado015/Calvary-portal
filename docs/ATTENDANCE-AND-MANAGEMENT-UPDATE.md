# Update: Attendance Checker, Service Schedule & Admin Management

This update turns your ideas into one organised change to the portal system. Put this file in `calvary-mean\docs\`.

---

## 1. What you asked for → what you get

| You asked | What the system now does |
|---|---|
| Super admin can edit the list of departments | New **Departments** page: add, rename, change the portal address, switch off, delete |
| Super admin can add / edit / delete cellgroups, members and others | New **Cellgroups** page (all ministries); **Members** page already had add/edit/delete; **Ushers**, **Baptism**, **User Accounts** unchanged |
| Attendance Checker for members with an *Individual Attendance* tab | **Attendance Checker** now has two tabs: **Service Attendance** (monthly grid, like your screenshot) and **Individual Attendance** (one member at a time) |
| More services than Sunday and Wednesday | New **Service Schedule** page. Built in: Sunday, Wednesday, **Friday (Youth only)**, **Prayer Meeting (AMM and LM)**. You can add more |
| AMM and LM set the date of their prayer meeting, click it, and check their members | Each ministry uses **Add Meeting Date** on its own Attendance page. The date becomes a column, its members are listed, they just tick |

---

## 2. The service schedule

| Service | When | Who it applies to |
|---|---|---|
| Sunday Service | Every Sunday (automatic) | All ministries |
| Wednesday Service | Every Wednesday (automatic) | All ministries |
| **Friday Service** | Every Friday (automatic) | **Youth only** |
| **Prayer Meeting** | **Dates set by each ministry** | **AMM and LM** |

Weekly services appear on their own. "Custom dates" services (Prayer Meeting) only appear on the dates a ministry has set. The super admin or head usher can change any of this under **Service Schedule** (rename, change the day, change who it applies to, switch off, add a new service).

---

## 3. How a ministry sets its prayer meeting date

1. Log in to the ministry portal (for example the AMM leader) and open **Attendance**.
2. Click **+ Add Meeting Date**.
3. Choose the date. Tick **Repeat every month on this day** if the meeting is always on the same day of the month (for example every 15th). It creates the next 12 months. A 31st becomes the last day of shorter months.
4. The date now shows as a **Prayer Meeting** column. Only that ministry's members are listed for it.
5. On or after the day, tick who came and press **Save**.

To remove a date, click the **✕** under its day number. Any attendance already saved for that date is deleted with it, so you are asked first.

AMM and LM each have their own dates and cannot see or change each other's. The super admin can add a date for any ministry from the admin Attendance Checker.

---

## 4. The screens

### Attendance Checker → Service Attendance
- Month arrows at the top. Columns are grouped by service (Sunday, Wednesday, Friday, Prayer Meeting) with the day numbers.
- Tick a box to mark a member present. Click a **day number** to tick or untick everyone for that date.
- **Mark All Present**, **Clear Attendance** (asks first), **Copy Previous Week** (fills empty columns from the week before), **Export Excel (CSV)**.
- Each service shows its average (for example "Sunday Service avg: 59%"). The bottom shows **Present** and **Rate**.
- Nothing is saved until you press **Save**. The screen tells you how many changes are waiting and warns you before you leave the month.
- Future dates are locked. A dash means that service does not apply to that member (for example Friday for a non-Youth member).
- Admin has a **ministry filter**. Each portal only shows its own ministry.

### Attendance Checker → Individual Attendance
Search a member, then see every service that applies to them in the month, tick the ones they attended, and see attended count, rate and last attended date.

### Admin pages (new)
- **Departments** (super admin): members / cellgroups / logins per ministry, **Open portal**, add, edit, switch on/off, delete.
- **Cellgroups** (super admin and head usher): all cellgroups, filter by ministry, add, edit leaders, move, switch off, **Report** link. Only super admin can delete.
- **Service Schedule** (super admin and head usher): as in section 2.

### Where to find it
- Admin: **Attendance Checker**, **Departments**, **Cellgroups**, **Service Schedule** in the left menu.
- Ministry portals: new **Attendance** item in the left menu.

---

## 5. Who can do what

| Action | Super admin | Head usher | Secretary (ministry portal) | Usher / counter | Viewer |
|---|---|---|---|---|---|
| Tick and save attendance | All ministries | All ministries | Own ministry | All ministries* | No (view only) |
| Add / remove meeting dates | Any ministry | Any ministry | Own ministry | No | No |
| Change the Service Schedule | Yes | Yes | No | No | No |
| Add / edit / delete departments | Yes | No | No | No | No |
| Add / edit cellgroups | Yes | Yes | Leaders only, own ministry | No | No |
| Delete cellgroups | Yes | No | No | No | No |

\* An usher or counter account that has no ministry assigned. If you give the account a ministry in **User Accounts**, it is limited to that ministry.

---

## 6. Protections added (so data stays clean)

- A **department** with members, cellgroups, logins or service types **cannot be deleted**. The message tells you what is in the way. Use **Switch off** instead.
- A **cellgroup** with members or report history cannot be deleted, and cannot be moved to another ministry while it still has members.
- A **member's cellgroup must belong to the member's ministry**. Changing a member's department clears the cellgroup choice.
- Friday Service cannot be marked for a non-Youth member, and a Prayer Meeting cannot be marked for another ministry's members. This is checked on the server, not just on screen.
- A ministry user can only view and edit its own ministry's attendance. Other ministries return "Forbidden".
- Members can no longer be created with a hand-picked member ID or "registered by" value.

---

## 7. What happens behind the scenes

- **New data:** a `ServiceType` list, and services now record their type and (for prayer meetings) their ministry.
- **Attendance is now one mark per member per service** (it used to be one per member per *date*, which would have blocked a Wednesday service and a prayer meeting on the same day).
- **On every server start** the server (1) replaces the old attendance index with the new one, (2) creates the four built-in services if they are missing, and (3) links your older "Sunday Divine Service" style services to the Sunday type so that old attendance still shows. You will see `Created service types: …` the first time.
- Friday and Prayer Meeting are only created once the **Youth / AMM / LM** departments exist. They do if you ran `npm run seed`.

---

## 8. Install

**1. Back up** (optional but wise): in MongoDB Atlas you can take a snapshot, or just keep going if this is still test data.

**2. Copy the files.** Extract the zip straight into your project so the folders merge. In PowerShell (change the zip path to where you saved it):

```powershell
cd "C:\Users\Lenovo\Desktop\CALVARY PORTAL"
Expand-Archive -Path "$HOME\Downloads\attendance-update.zip" -DestinationPath ".\calvary-mean" -Force
```

This overwrites the 32 changed files and keeps everything else, including your `.env` and `server\config\db.js`. No new packages were added, so no `npm install` is needed.

**3. Restart the API** (stop it with Ctrl+C if it is running):

```powershell
cd "C:\Users\Lenovo\Desktop\CALVARY PORTAL\calvary-mean\server"
npm run dev
```

Look for `MongoDB connected`, then (first time only) `Created service types: Sunday Service, Wednesday Service, Friday Service, Prayer Meeting`, then `Server running on port 5000`.

**4. Start the app** in a second terminal and hard refresh the browser (`Ctrl + Shift + R`):

```powershell
cd "C:\Users\Lenovo\Desktop\CALVARY PORTAL\calvary-mean\client"
npx ng serve
```

If the service types did not get created (for example `npm run seed` was never run), run `npm run seed` in the `server` folder and restart.

---

## 9. Test checklist

1. Log in as `admin@calvarytabernacle.org`. In the left menu you should see **Departments**, **Cellgroups** and **Service Schedule**.
2. **Service Schedule** lists Sunday, Wednesday, Friday (Youth) and Prayer Meeting (Adult Men Ministry, Ladies Ministries).
3. **Departments**: add a test department, rename it, then delete it. Try deleting Youth: it should refuse and say what it contains.
4. **Attendance Checker** (admin): the grid shows the month with Sunday, Wednesday and Friday columns. Pick **Youth** in the ministry filter: Friday columns are active. Pick **Adult Men Ministry**: no Friday columns.
5. Tick a few boxes, press **Save**, refresh: the ticks are still there.
6. **Individual Attendance**: search a member, tick a service, Save, switch back to Service Attendance and see the same tick.
7. Log in as an AMM portal user (create one under **User Accounts**, ministry = Adult Men Ministry). Open **Attendance**, **Add Meeting Date**, pick a date with the repeat box ticked, and see the Prayer Meeting column appear with only AMM members.
8. Log in as an LM user: the AMM prayer date is not visible.
9. **Cellgroups** (admin): add a cellgroup, open its **Report**, try to delete one that has members: it should refuse.
10. **Export Excel (CSV)** opens in Excel.

---

## 10. Known limits (not in this update)

- **Other pages still show all ministries to the server.** Attendance and cellgroup reports are locked to a user's own ministry, but the Members, Visitors and Reports pages still rely on the screen filtering. A tech-savvy ministry user could request another ministry's list. Tightening this is the next recommended step.
- **No PDF export** on the attendance grid. CSV opens in Excel, and you can print or save as PDF from there.
- **No admin Visitors page.** Visitors are managed inside each ministry portal.
- **Tick = present.** The grid is a single checkbox. Late / excused / absent statuses exist in the data (older records may have them) but are shown as a plain tick or blank. A "late" mark still counts as attended.
- **Dates and time zones.** The new attendance screens use your computer's local date. A few older places (the dashboard's "today" and the visitor registration date) use UTC, so between midnight and 8 AM Philippine time they can show the previous day.
- Not yet run against your live MongoDB in a browser: please go through the checklist in section 9 and report anything odd.
