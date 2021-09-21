import axios from "axios";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../Auth";
import Avatar from "../components/Avatar";
import Button from "../components/Button";
import Center from "../components/Center";
import Chat from "../components/Chat";
import Video from "../components/Video";
import { Action, RoomResponse, RoomState, VideoData } from "../types";

const reducer = (state: RoomState, action: Action) => {
  switch (action.type) {
    case "ADD":
      return {
        ...state,
        [action.property]: [...state[action.property], action.payload],
      };
    case "REMOVE":
      return {
        ...state,
        [action.property]: state[action.property].filter(
          (item: any) => item.id !== action.payload.id
        ),
      };
    case "SET":
      return {
        ...state,
        [action.property]: action.payload,
      };
    default:
      return state;
  }
};

const LoadRoom = (props: {
  match: {
    params: {
      roomId: string;
    };
  };
}) => {
  const [room, setRoom] = useState<RoomState>();

  useEffect(() => {
    axios
      .get<RoomResponse>(`/room/${props.match.params.roomId}`)
      .then((resp) =>
        setRoom({ success: resp.data.success, ...resp.data.room })
      )
      .catch((err) =>
        setRoom(
          err.response
            ? err.response.data
            : {
                id: "",
                error: err.message,
                success: false,
                users: [],
                messages: [],
              }
        )
      );
  }, [props.match.params.roomId]);

  if (!room) {
    return <Center style={{ fontSize: "3rem" }}>Loading...</Center>;
  }

  if (room.error) {
    return (
      <Center style={{ fontSize: "3rem" }}>
        {room.error}
        <br />
        <Link to="/">
          <Button>Go back to the home page</Button>
        </Link>
      </Center>
    );
  }

  return <Room room={room} />;
};

const Room = (props: { room: RoomState }) => {
  const { room } = props;
  const auth = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, dispatch] = React.useReducer(reducer, props.room);

  const emitAction = (action: Action) => socket?.emit("action", action);

  useEffect(() => {
    if (socket) {
      return;
    }

    const _socket = io(
      process.env.REACT_APP_API_URL || "http://localhost:5000",
      {
        query: { roomId: room.id },
      }
    );
    setSocket(_socket);

    _socket.on("connect", () => {
      _socket.emit("join", { roomId: room.id, user: auth.user });
      _socket.on("action", (action: Action) => dispatch(action));
    });
  }, [auth.user, room.id, socket]);

  if (!socket) {
    return <Center>Loading...</Center>;
  }

  return (
    <div>
      <div className="header">
        <div className="left">
          <Link
            to="/"
            className="is-wrapper nuxt-link-exact-active nuxt-link-active"
          >
            <div className="logo-small logo-mask"></div>
          </Link>
          <h1
            className="header-title"
            onClick={() => navigator.clipboard?.writeText(room.id)}
            style={{ cursor: "pointer" }}
          >
            {state.id}
          </h1>
        </div>
        <div className="right">
          {state.users.map((u) => (
            <img src={u.avatar} />
          ))}
        </div>
      </div>
      <div className="content is-center">
        <div className="room-wrapper">
          <div className="room">
            <div className="player-wrapper" style={{ width: "78%", bottom: 0 }}>
              <Video
                videoData={{
                  ...state.video,
                  // url: state.video.url,
                  url: "https://api.imovies.cc/api/v1/movies/44822/files/1318315",
                }}
                owner={state.ownerId === auth.user.id}
                emitAction={emitAction}
              />
            </div>
          </div>
        </div>
        <Chat
          user={auth.user}
          messages={state.messages}
          sendMessage={(msg) =>
            emitAction({
              type: "ADD",
              property: "messages",
              payload: msg,
            })
          }
        />
      </div>
    </div>
  );
};

export default LoadRoom;
