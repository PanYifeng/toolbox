package web

// 联机房间座位归属校验测试：覆盖「空位自动 AI 补位」的授权语义。
// 2026-11-22 实录：开局后空置人类座位在快照里被冻结成 AI，但服务端座位表仍是
// human/未占——旧逻辑只认 isAI 座位可代驱，导致房主被 403 挡住、对局卡死。

import "testing"

// mkRoom 构造座位表：ai = 该座位是否 AI，clients = 各座位占座 clientId（空串 = 未占）
func mkRoom(ai []bool, clients []string, actions int) *room {
	r := &room{}
	for i := range ai {
		r.Seats = append(r.Seats, roomSeat{IsAI: ai[i], ClientID: clients[i]})
	}
	for i := 0; i < actions; i++ {
		r.Actions = append(r.Actions, roomAction{Seq: i})
	}
	return r
}

func TestRoomAuthorize(t *testing.T) {
	const me, other = "aaaa-bbbb-cccc", "dddd-eeee-ffff"

	cases := []struct {
		name    string
		room    *room
		in      roomActorInput
		wantErr bool
	}{
		{
			name: "本人人类座位",
			room: mkRoom([]bool{false, true}, []string{me, ""}, 0),
			in:   roomActorInput{ClientID: me, Seat: 0},
		},
		{
			name:    "他人人类座位",
			room:    mkRoom([]bool{false, false}, []string{me, other}, 0),
			in:      roomActorInput{ClientID: me, Seat: 1},
			wantErr: true,
		},
		{
			name: "AI 座位由在座人类代驱",
			room: mkRoom([]bool{false, true}, []string{me, ""}, 0),
			in:   roomActorInput{ClientID: me, Seat: 1},
		},
		{
			name:    "AI 座位由旁观者代驱（不在座）",
			room:    mkRoom([]bool{false, true}, []string{me, ""}, 3),
			in:      roomActorInput{ClientID: other, Seat: 1},
			wantErr: true,
		},
		{
			name:    "开局前空置人类座位不接受他人代下",
			room:    mkRoom([]bool{false, false}, []string{me, ""}, 0),
			in:      roomActorInput{ClientID: me, Seat: 1},
			wantErr: true,
		},
		{
			name: "开局后空置人类座位（快照冻结为 AI）可由在座人类代驱",
			room: mkRoom([]bool{false, false}, []string{me, ""}, 1),
			in:   roomActorInput{ClientID: me, Seat: 1},
		},
		{
			name:    "座位号越界",
			room:    mkRoom([]bool{false, true}, []string{me, ""}, 0),
			in:      roomActorInput{ClientID: me, Seat: 5},
			wantErr: true,
		},
		{
			name: "第三人离开后其座位开局后可代驱",
			room: mkRoom([]bool{false, false, true}, []string{me, "", ""}, 2),
			in:   roomActorInput{ClientID: me, Seat: 1},
		},
	}

	for _, c := range cases {
		err := roomAuthorize(c.room, c.in)
		if (err != nil) != c.wantErr {
			t.Errorf("%s: err=%v, wantErr=%v", c.name, err, c.wantErr)
		}
	}
}
