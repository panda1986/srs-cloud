//
// Copyright (c) 2022-2023 Winlin
//
// SPDX-License-Identifier: AGPL-3.0-or-later
//
import React from "react";
import {useSrsLanguage} from "../components/LanguageSwitch";
import {Accordion, Button, Card, Form, Nav, Table} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import axios from "axios";
import {Clipboard, Token} from "../utils";
import {useErrorHandler} from "react-error-boundary";
import {useSearchParams} from "react-router-dom";
import {buildUrls} from "../components/UrlGenerator";
import {SrsEnvContext} from "../components/SrsEnvContext";
import * as Icon from "react-bootstrap-icons";
import PopoverConfirm from "../components/PopoverConfirm";

export default function ScenarioLiveRoom() {
  const [searchParams] = useSearchParams();
  // The room id, to maintain a specified room.
  const [roomId, setRoomId] = React.useState();

  React.useEffect(() => {
    const id = searchParams.get('roomid') || null;
    console.log(`?roomid=xxx, current=${id}, Set the roomid to manage.`);
    setRoomId(id);
  }, [searchParams, setRoomId]);

  if (roomId) return <ScenarioLiveRoomManager {...{setRoomId, roomId}} />;
  return <ScenarioLiveRoomImpl {...{setRoomId}} />;
}

export function ScenarioLiveRoomImpl({setRoomId}) {
  const language = useSrsLanguage();
  const {t} = useTranslation();
  const handleError = useErrorHandler();
  const [searchParams, setSearchParams] = useSearchParams();
  const [name, setName] = React.useState('My Live Room');
  const [rooms, setRooms] = React.useState([]);
  const [refreshNow, setRefreshNow] = React.useState();

  const createLiveRoom = React.useCallback((e) => {
    e.preventDefault();

    axios.post('/terraform/v1/live/room/create', {
      title: name,
    }, {
      headers: Token.loadBearerHeader(),
    }).then(res => {
      const {uuid} = res.data.data;
      searchParams.set('roomid', uuid); setSearchParams(searchParams);
      setRoomId(uuid);
      console.log(`Status: Create ok, name=${name}, data=${JSON.stringify(res.data.data)}`);
    }).catch(handleError);
  }, [handleError, name, setRoomId, searchParams, setSearchParams]);

  const removeRoom = React.useCallback((uuid) => {
    axios.post('/terraform/v1/live/room/remove', {
      uuid: uuid,
    }, {
      headers: Token.loadBearerHeader(),
    }).then(res => {
      setRefreshNow(!refreshNow);
      console.log(`Status: Remove ok, uuid=${uuid}, data=${JSON.stringify(res.data.data)}`);
    }).catch(handleError);
  }, [handleError, refreshNow, setRefreshNow]);

  const manageRoom = React.useCallback((room) => {
    const uuid = room.uuid;
    searchParams.set('roomid', uuid); setSearchParams(searchParams);
    setRoomId(room.uuid);
  }, [searchParams, setSearchParams, setRoomId]);

  React.useEffect(() => {
    const refreshLiveRoomsTask = () => {
      axios.post('/terraform/v1/live/room/list', {
      }, {
        headers: Token.loadBearerHeader(),
      }).then(res => {
        const {rooms} = res.data.data;
        setRooms(rooms || []);
        console.log(`Status: List ok, data=${JSON.stringify(res.data.data)}`);
      }).catch(handleError);
    };

    refreshLiveRoomsTask();
    const timer = setInterval(() => refreshLiveRoomsTask(), 3 * 1000);
    return () => {
      clearInterval(timer);
      setRooms([]);
    }
  }, [handleError, setRooms, refreshNow]);

  return (
    <Accordion defaultActiveKey={['1', '2']}>
      <React.Fragment>
        {language === 'zh' ?
          <Accordion.Item eventKey="0">
            <Accordion.Header>场景介绍</Accordion.Header>
            <Accordion.Body>
              <div>直播间，提供了按每个流鉴权的能力，并支持直播间的业务功能。</div>
              <p></p>
              <p>可应用的具体场景包括：</p>
              <ul>
                <li>自建直播间，私域直播，仅限私域会员能观看的直播。</li>
                <li>企业直播，企业内部的直播间，仅限企业内部人员观看。</li>
                <li>电商直播，仅限电商特定买家可观看的直播。</li>
              </ul>
            </Accordion.Body>
          </Accordion.Item> :
          <Accordion.Item eventKey="0">
            <Accordion.Header>Scenario Introduction</Accordion.Header>
            <Accordion.Body>
              <div>Live room, which provides the ability to authenticate each stream and supports business functions of live room.</div>
              <p></p>
              <p>The specific scenarios that can be applied include:</p>
              <ul>
                <li>Self-built live room, private domain live broadcast, live broadcast that can only be watched by private domain members.</li>
                <li>Enterprise live broadcast, live room within the enterprise, only for internal personnel of the enterprise.</li>
                <li>E-commerce live broadcast, live broadcast that can only be watched by specific buyers of e-commerce.</li>
              </ul>
            </Accordion.Body>
          </Accordion.Item>}
      </React.Fragment>
      <Accordion.Item eventKey="1">
        <Accordion.Header>{t('lr.create.title')}</Accordion.Header>
        <Accordion.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{t('lr.create.name')}</Form.Label>
              <Form.Text> * {t('lr.create.name2')}</Form.Text>
              <Form.Control as="input" defaultValue={name} onChange={(e) => setName(e.target.value)} />
            </Form.Group>
            <Button ariant="primary" type="submit" onClick={(e) => createLiveRoom(e)}>
              {t('helper.create')}
            </Button>
          </Form>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="2">
        <Accordion.Header>{t('lr.list.title')}</Accordion.Header>
        <Accordion.Body>
          {rooms?.length ? <Table striped bordered hover>
            <thead>
            <tr>
              <th>#</th>
              <th>UUID</th>
              <th>Title</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
            </thead>
            <tbody>
            {rooms?.map((room, index) => {
              return <tr key={room.uuid}>
                <td>{index}</td>
                <td>{room.uuid}</td>
                <td>{room.title}</td>
                <td>{room.created_at}</td>
                <td>
                  <a href="#!" onClick={(e) => {
                    e.preventDefault();
                    manageRoom(room);
                  }}>{t('helper.manage')}</a> &nbsp;
                  <PopoverConfirm placement='top' trigger={ <a href='#!'>{t('helper.delete')}</a> } onClick={() => removeRoom(room.uuid)}>
                    <p>
                      {t('lr.list.delete')}
                    </p>
                  </PopoverConfirm>
                </td>
              </tr>;
            })}
            </tbody>
          </Table> : t('lr.list.empty')}
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}

function ScenarioLiveRoomManager({roomId, setRoomId}) {
  const handleError = useErrorHandler();
  const env = React.useContext(SrsEnvContext)[0];
  const {t} = useTranslation();
  const [room, setRoom] = React.useState({});
  const [urls, setUrls] = React.useState({});
  const [streamType, setStreamType] = React.useState('rtmp');

  const copyToClipboard = React.useCallback((e, text) => {
    e.preventDefault();

    Clipboard.copy(text).then(() => {
      alert(t('helper.copyOk'));
    }).catch((err) => {
      alert(`${t('helper.copyFail')} ${err}`);
    });
  }, [t]);

  React.useEffect(() => {
    axios.post('/terraform/v1/live/room/query', {
      uuid: roomId,
    }, {
      headers: Token.loadBearerHeader(),
    }).then(res => {
      setRoom(res.data.data);
      console.log(`Status: Query ok, uuid=${roomId}, data=${JSON.stringify(res.data.data)}`);
    }).catch(handleError);
  }, [handleError, setRoom, roomId]);

  React.useEffect(() => {
    if (!room?.secret) return;
    const urls = buildUrls(`live/${roomId}`, {publish: room.secret}, env);
    setUrls(urls);
  }, [room, env, setUrls, roomId]);

  const onChangeStreamType = React.useCallback((e, t) => {
    e.preventDefault();
    setStreamType(t);
  }, [setStreamType]);

  const {
    rtmpServer, rtmpStreamKey, hlsPlayer, m3u8Url, srtPublishUrl,
  } = urls;

  return <>
    <Accordion defaultActiveKey={['0', '1', '2', '3']}>
      <Accordion.Item eventKey="0">
        <Accordion.Header>{t('lr.room.nav')}</Accordion.Header>
        <Accordion.Body>
          <Button variant="link" onClick={() => setRoomId(null)}>Back to Rooms</Button>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="1">
        <Accordion.Header>{t('lr.room.stream')}</Accordion.Header>
        <Accordion.Body>
          <Card>
            <Card.Header>
              <Nav variant="tabs" defaultActiveKey="#rtmp">
                <Nav.Item>
                  <Nav.Link href="#rtmp" onClick={(e) => onChangeStreamType(e, 'rtmp')}>{t('live.obs.title')}</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link href="#srt" onClick={(e) => onChangeStreamType(e, 'srt')}>{t('live.srt.title')}</Nav.Link>
                </Nav.Item>
              </Nav>
            </Card.Header>
            {streamType === 'rtmp' ? <Card.Body>
              <div>
                {t('live.obs.server')} <code>{rtmpServer}</code> &nbsp;
                <div role='button' style={{display: 'inline-block'}} title={t('helper.copy')}>
                  <Icon.Clipboard size={20} onClick={(e) => copyToClipboard(e, rtmpServer)} />
                </div>
              </div>
              <div>
                {t('live.obs.key')} <code>{rtmpStreamKey}</code> &nbsp;
                <div role='button' style={{display: 'inline-block'}} title={t('helper.copy')}>
                  <Icon.Clipboard size={20} onClick={(e) => copyToClipboard(e, rtmpStreamKey)} />
                </div>
              </div>
              <div>
                {t('live.share.hls')}&nbsp;
                <a href={hlsPlayer} target='_blank' rel='noreferrer'>{t('live.share.simple')}</a>,&nbsp;
                <code>{m3u8Url}</code> &nbsp;
                <div role='button' style={{display: 'inline-block'}} title={t('helper.copy')}>
                  <Icon.Clipboard size={20} onClick={(e) => copyToClipboard(e, m3u8Url)} />
                </div>
              </div>
            </Card.Body> :
            <Card.Body>
              <div>
                {t('live.obs.server')} <code>{srtPublishUrl}</code> &nbsp;
                <div role='button' style={{display: 'inline-block'}} title={t('helper.copy')}>
                  <Icon.Clipboard size={20} onClick={(e) => copyToClipboard(e, srtPublishUrl)} />
                </div>
              </div>
              <div>
                {t('live.obs.key')} <code>{t('live.obs.nokey')}</code>
              </div>
              <div>
                {t('live.share.hls')}&nbsp;
                <a href={hlsPlayer} target='_blank' rel='noreferrer'>{t('live.share.simple')}</a>,&nbsp;
                <code>{m3u8Url}</code> &nbsp;
                <div role='button' style={{display: 'inline-block'}} title={t('helper.copy')}>
                  <Icon.Clipboard size={20} onClick={(e) => copyToClipboard(e, m3u8Url)} />
                </div>
              </div>
            </Card.Body>}
          </Card>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="2">
        <Accordion.Header>{t('lr.room.ai')}</Accordion.Header>
        <Accordion.Body>
          On the way...
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  </>;
}